(() => {
  let token = sessionStorage.getItem("admin_token");
  let siteData = null;
  let metrics = {};
  let currentSort = "most";
  const pendingLinkImages = new Map();

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Toast Notifications ---
  function showToast(message, type = "success", duration = 3000) {
    const container = $("#toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "error" : ""}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("removing");
      toast.addEventListener("animationend", () => toast.remove());
    }, duration);
  }

  // --- Confirmation Modal ---
  function showConfirm(title, message) {
    return new Promise((resolve) => {
      const modal = $("#confirm-modal");
      $("#confirm-title").textContent = title;
      $("#confirm-message").textContent = message;
      modal.classList.add("active");

      function cleanup(result) {
        modal.classList.remove("active");
        $("#confirm-ok").removeEventListener("click", onOk);
        $("#confirm-cancel").removeEventListener("click", onCancel);
        resolve(result);
      }

      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }

      $("#confirm-ok").addEventListener("click", onOk);
      $("#confirm-cancel").addEventListener("click", onCancel);
    });
  }

  // --- Animated Counter ---
  function animateCount(el, target) {
    const duration = 600;
    const start = parseInt(el.textContent) || 0;
    const diff = target - start;
    if (diff === 0) { el.textContent = target; return; }
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + diff * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- Button Loading State ---
  function setLoading(btn, loading) {
    if (loading) {
      btn.classList.add("loading");
      btn.disabled = true;
    } else {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  // --- Auth ---
  function showAdmin() {
    $("#login-screen").hidden = true;
    $("#admin-panel").hidden = false;
    loadSiteData();
    loadMetrics();
  }

  function showLogin() {
    $("#login-screen").hidden = false;
    $("#admin-panel").hidden = true;
    sessionStorage.removeItem("admin_token");
    token = null;
  }

  // Password toggle
  $("#password-toggle").addEventListener("click", () => {
    const input = $("#login-password");
    const toggle = $("#password-toggle");
    if (input.type === "password") {
      input.type = "text";
      toggle.textContent = "\u{1F648}";
    } else {
      input.type = "password";
      toggle.textContent = "\u{1F441}";
    }
  });

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = $("#login-password").value;
    const errorEl = $("#login-error");
    const loginBox = $("#login-box");
    errorEl.hidden = true;

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || "Login failed";
        errorEl.hidden = false;
        loginBox.classList.remove("shake");
        void loginBox.offsetWidth;
        loginBox.classList.add("shake");
        return;
      }
      token = data.token;
      sessionStorage.setItem("admin_token", token);
      showAdmin();
    } catch (err) {
      errorEl.textContent = "Connection error";
      errorEl.hidden = false;
      loginBox.classList.remove("shake");
      void loginBox.offsetWidth;
      loginBox.classList.add("shake");
    }
  });

  $("#logout-btn").addEventListener("click", showLogin);

  // --- Tabs ---
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      $$(".tab-content").forEach((tc) => tc.classList.remove("active"));
      tab.classList.add("active");
      $(`#tab-${tab.dataset.tab}`).classList.add("active");
    });
  });

  // --- API helpers ---
  function authHeaders() {
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async function loadSiteData() {
    try {
      const res = await fetch("/api/site-data");
      siteData = await res.json();
      renderLinksEditor();
      renderProfile();
    } catch (err) {
      console.error("Failed to load site data:", err);
    }
  }

  async function loadMetrics() {
    try {
      const res = await fetch("/api/metrics", { headers: authHeaders() });
      if (res.ok) {
        metrics = await res.json();
        renderMetrics();
      }
    } catch (err) {
      console.error("Failed to load metrics:", err);
    }
  }

  // --- Dashboard ---
  function renderMetrics() {
    const tbody = $("#metrics-table tbody");
    tbody.innerHTML = "";
    let total = 0;

    // Build a flat list of all links
    const allLinks = [];
    if (siteData) {
      siteData.socials.forEach((s) => allLinks.push({ label: s.platform, id: s.id }));
      siteData.sections.forEach((sec) => {
        sec.links.forEach((l) => allLinks.push({ label: l.label, id: l.id }));
      });
    }

    // Collect all counts (including removed links)
    const shown = new Set();
    const entries = [];

    allLinks.forEach((link) => {
      const count = metrics[link.id] || 0;
      total += count;
      shown.add(link.id);
      entries.push({ label: link.label, id: link.id, count, removed: false });
    });

    // Extra metric keys not in current data (removed links)
    Object.keys(metrics).forEach((key) => {
      if (!shown.has(key)) {
        total += metrics[key];
        entries.push({ label: "(removed)", id: key, count: metrics[key], removed: true });
      }
    });

    // Sort entries
    switch (currentSort) {
      case "most":
        entries.sort((a, b) => b.count - a.count);
        break;
      case "fewest":
        entries.sort((a, b) => a.count - b.count);
        break;
      case "alpha":
        entries.sort((a, b) => a.label.localeCompare(b.label));
        break;
    }

    // Summary stats
    const activeCount = allLinks.length;
    const avg = activeCount > 0 ? Math.round(total / activeCount) : 0;
    let topEntry = entries.length > 0 ? entries.reduce((a, b) => a.count >= b.count ? a : b) : null;

    animateCount($("#total-clicks"), total);
    animateCount($("#active-links"), activeCount);
    animateCount($("#avg-clicks"), avg);
    $("#top-link-name").textContent = topEntry && topEntry.count > 0 ? topEntry.label : "\u2014";

    // Find max for bar chart proportions
    const maxClicks = Math.max(...entries.map((e) => e.count), 1);

    // Render rows
    entries.forEach((entry) => {
      const share = total > 0 ? ((entry.count / total) * 100).toFixed(1) : "0.0";
      const barWidth = Math.round((entry.count / maxClicks) * 100);
      const tr = document.createElement("tr");
      if (entry.removed) tr.classList.add("removed-link");
      tr.innerHTML = `<td>${entry.removed ? "<em>" + esc(entry.label) + "</em>" : esc(entry.label)}</td><td><code>${esc(entry.id)}</code></td><td>${entry.count}<div class="metric-bar" style="width: ${barWidth}%"></div></td><td class="share-cell">${share}%</td>`;
      tbody.appendChild(tr);
    });
  }

  // Sort dropdown
  $("#sort-select").addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderMetrics();
  });

  $("#refresh-metrics").addEventListener("click", async () => {
    const btn = $("#refresh-metrics");
    setLoading(btn, true);
    await loadMetrics();
    setLoading(btn, false);
  });

  // --- Links Editor ---
  function renderLinksEditor() {
    const container = $("#sections-editor");
    container.innerHTML = "";
    if (!siteData) return;

    siteData.sections.forEach((section, si) => {
      const block = document.createElement("div");
      block.className = "section-block";
      block.dataset.sectionIndex = si;

      let html = `<div class="section-header">
        <span class="drag-handle" title="Drag to reorder">\u205E\u205E</span>
        <input type="text" value="${escAttr(section.title)}" data-field="title" placeholder="Section title">
        <button class="btn-small btn-danger delete-section" title="Delete section">&times;</button>
      </div>`;

      section.links.forEach((link, li) => {
        const thumbStyle = link.image ? `background-image: url(${escAttr(link.image)})` : '';
        const thumbClass = link.image ? 'link-thumb-preview has-image' : 'link-thumb-preview';
        html += `<div class="link-row" data-link-index="${li}">
          <div class="${thumbClass}" style="${thumbStyle}" data-link-id="${escAttr(link.id)}" title="Click to upload image">${link.image ? '' : '\u{1F4F7}'}</div>
          <input type="file" class="link-image-input" accept="image/*" hidden>
          <input class="link-label" type="text" value="${escAttr(link.label)}" placeholder="Label" data-field="label">
          <input class="link-url" type="text" value="${escAttr(link.url)}" placeholder="URL" data-field="url">
          <button class="move-up" title="Move up">&uarr;</button>
          <button class="move-down" title="Move down">&darr;</button>
          <button class="delete-link" title="Delete">&times;</button>
        </div>`;
      });

      html += `<div class="section-actions">
        <button class="btn btn-add add-link">+ Add Link</button>
      </div>`;

      block.innerHTML = html;
      container.appendChild(block);
    });

    // Attach events
    container.querySelectorAll(".delete-section").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const block = e.target.closest(".section-block");
        const si = parseInt(block.dataset.sectionIndex);
        const title = siteData.sections[si].title || "this section";
        const confirmed = await showConfirm("Delete Section", `Delete "${title}" and all its links?`);
        if (!confirmed) return;
        siteData.sections.splice(si, 1);
        renderLinksEditor();
        showToast("Section deleted");
      });
    });

    container.querySelectorAll(".add-link").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const block = e.target.closest(".section-block");
        const si = parseInt(block.dataset.sectionIndex);
        const id = "link-" + Date.now();
        siteData.sections[si].links.push({ id, label: "", url: "" });
        renderLinksEditor();
      });
    });

    container.querySelectorAll(".delete-link").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const block = e.target.closest(".section-block");
        const row = e.target.closest(".link-row");
        const si = parseInt(block.dataset.sectionIndex);
        const li = parseInt(row.dataset.linkIndex);
        const label = siteData.sections[si].links[li].label || "this link";
        const confirmed = await showConfirm("Delete Link", `Delete "${label}"?`);
        if (!confirmed) return;
        siteData.sections[si].links.splice(li, 1);
        renderLinksEditor();
        showToast("Link deleted");
      });
    });

    container.querySelectorAll(".move-up").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const block = e.target.closest(".section-block");
        const row = e.target.closest(".link-row");
        const si = parseInt(block.dataset.sectionIndex);
        const li = parseInt(row.dataset.linkIndex);
        if (li > 0) {
          const links = siteData.sections[si].links;
          [links[li - 1], links[li]] = [links[li], links[li - 1]];
          renderLinksEditor();
        }
      });
    });

    container.querySelectorAll(".move-down").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const block = e.target.closest(".section-block");
        const row = e.target.closest(".link-row");
        const si = parseInt(block.dataset.sectionIndex);
        const li = parseInt(row.dataset.linkIndex);
        const links = siteData.sections[si].links;
        if (li < links.length - 1) {
          [links[li], links[li + 1]] = [links[li + 1], links[li]];
          renderLinksEditor();
        }
      });
    });

    // Link image upload
    container.querySelectorAll(".link-thumb-preview").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const row = thumb.closest(".link-row");
        row.querySelector(".link-image-input").click();
      });
    });

    container.querySelectorAll(".link-image-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const row = input.closest(".link-row");
        const block = row.closest(".section-block");
        const si = parseInt(block.dataset.sectionIndex);
        const li = parseInt(row.dataset.linkIndex);
        const linkId = siteData.sections[si].links[li].id;
        const thumb = row.querySelector(".link-thumb-preview");

        processLinkImageFile(file, (dataUrl, base64) => {
          pendingLinkImages.set(linkId, base64);
          thumb.style.backgroundImage = `url(${dataUrl})`;
          thumb.textContent = "";
          thumb.classList.add("has-image");
          showToast("Image ready \u2014 save to apply");
        });
      });
    });
  }

  function syncLinksFromDOM() {
    $$(".section-block").forEach((block) => {
      const si = parseInt(block.dataset.sectionIndex);
      const section = siteData.sections[si];
      section.title = block.querySelector('[data-field="title"]').value;

      block.querySelectorAll(".link-row").forEach((row) => {
        const li = parseInt(row.dataset.linkIndex);
        section.links[li].label = row.querySelector('[data-field="label"]').value;
        section.links[li].url = row.querySelector('[data-field="url"]').value;
      });
    });
  }

  $("#add-section").addEventListener("click", () => {
    syncLinksFromDOM();
    const id = "section-" + Date.now();
    siteData.sections.push({ id, title: "", links: [] });
    renderLinksEditor();
  });

  $("#save-links").addEventListener("click", async () => {
    syncLinksFromDOM();
    const btn = $("#save-links");
    setLoading(btn, true);

    try {
      // Upload pending link images first
      for (const [linkId, imageBase64] of pendingLinkImages) {
        const uploadRes = await fetch("/api/upload-link-image", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ linkId, imageBase64 }),
        });
        if (!uploadRes.ok) throw new Error(`Image upload failed for ${linkId}`);
        const uploadData = await uploadRes.json();
        for (const section of siteData.sections) {
          const link = section.links.find((l) => l.id === linkId);
          if (link) {
            link.image = uploadData.image;
            break;
          }
        }
      }
      pendingLinkImages.clear();

      const res = await fetch("/api/save-data", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(siteData),
      });
      if (!res.ok) throw new Error("Save failed");
      showToast("Saved! Changes are live!");
    } catch (err) {
      showToast("Error saving: " + err.message, "error");
    } finally {
      setLoading(btn, false);
    }
  });

  // --- Profile ---
  function renderProfile() {
    if (!siteData) return;
    $("#profile-name").value = siteData.name || "";
    $("#profile-bio").value = siteData.bio || "";

    const preview = $("#avatar-preview");
    if (siteData.image) {
      preview.textContent = "";
      preview.style.backgroundImage = `url(${siteData.image})`;
    } else {
      preview.textContent = (siteData.name || "A").charAt(0).toUpperCase();
      preview.style.backgroundImage = "";
    }
  }

  let selectedImageBase64 = null;

  // Drop zone handlers
  const dropZone = $("#drop-zone");

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processImageFile(file);
    }
  });

  $("#image-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processImageFile(file);
  });

  function processLinkImageFile(file, callback) {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = dataUrl.split(",")[1];
      callback(dataUrl, base64);
    };
    img.src = URL.createObjectURL(file);
  }

  function processImageFile(file) {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      selectedImageBase64 = dataUrl.split(",")[1];

      const preview = $("#avatar-preview");
      preview.textContent = "";
      preview.style.backgroundImage = `url(${dataUrl})`;
      $("#upload-image").disabled = false;
      showToast("Image ready to upload");
    };
    img.src = URL.createObjectURL(file);
  }

  $("#upload-image").addEventListener("click", async () => {
    if (!selectedImageBase64) return;
    const btn = $("#upload-image");
    setLoading(btn, true);

    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ imageBase64: selectedImageBase64 }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      siteData.image = data.image;
      selectedImageBase64 = null;
      showToast("Image uploaded!");
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setLoading(btn, false);
      btn.disabled = !selectedImageBase64;
    }
  });

  $("#save-profile").addEventListener("click", async () => {
    siteData.name = $("#profile-name").value;
    siteData.bio = $("#profile-bio").value;

    const btn = $("#save-profile");
    setLoading(btn, true);

    try {
      const res = await fetch("/api/save-data", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(siteData),
      });
      if (!res.ok) throw new Error("Save failed");
      showToast("Profile saved! Changes are live!");
    } catch (err) {
      showToast("Error saving: " + err.message, "error");
    } finally {
      setLoading(btn, false);
    }
  });

  // --- Helpers ---
  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function escAttr(str) {
    return str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // --- Init ---
  if (token) {
    showAdmin();
  }
})();
