(() => {
  let token = sessionStorage.getItem("admin_token");
  let siteData = null;
  let metrics = {};

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

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

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = $("#login-password").value;
    const errorEl = $("#login-error");
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
        return;
      }
      token = data.token;
      sessionStorage.setItem("admin_token", token);
      showAdmin();
    } catch (err) {
      errorEl.textContent = "Connection error";
      errorEl.hidden = false;
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
      const res = await fetch("/data/site-data.json");
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

    // Add metrics entries
    const shown = new Set();
    allLinks.forEach((link) => {
      const count = metrics[link.id] || 0;
      total += count;
      shown.add(link.id);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${esc(link.label)}</td><td><code>${esc(link.id)}</code></td><td>${count}</td>`;
      tbody.appendChild(tr);
    });

    // Show any extra metric keys not in current data
    Object.keys(metrics).forEach((key) => {
      if (!shown.has(key)) {
        total += metrics[key];
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><em>(removed)</em></td><td><code>${esc(key)}</code></td><td>${metrics[key]}</td>`;
        tbody.appendChild(tr);
      }
    });

    $("#total-clicks").textContent = total;
  }

  $("#refresh-metrics").addEventListener("click", loadMetrics);

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
        <input type="text" value="${escAttr(section.title)}" data-field="title" placeholder="Section title">
        <button class="btn-small btn-danger delete-section" title="Delete section">&times;</button>
      </div>`;

      section.links.forEach((link, li) => {
        html += `<div class="link-row" data-link-index="${li}">
          <input class="link-label" type="text" value="${escAttr(link.label)}" placeholder="Label" data-field="label">
          <input class="link-url" type="text" value="${escAttr(link.url)}" placeholder="URL" data-field="url">
          <button class="move-up" title="Move up">&uarr;</button>
          <button class="move-down" title="Move down">&darr;</button>
          <button class="delete-link" title="Delete">&times;</button>
        </div>`;
      });

      html += `<div class="section-actions">
        <button class="btn add-link">+ Add Link</button>
      </div>`;

      block.innerHTML = html;
      container.appendChild(block);
    });

    // Attach events
    container.querySelectorAll(".delete-section").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const block = e.target.closest(".section-block");
        const si = parseInt(block.dataset.sectionIndex);
        siteData.sections.splice(si, 1);
        renderLinksEditor();
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
      btn.addEventListener("click", (e) => {
        const block = e.target.closest(".section-block");
        const row = e.target.closest(".link-row");
        const si = parseInt(block.dataset.sectionIndex);
        const li = parseInt(row.dataset.linkIndex);
        siteData.sections[si].links.splice(li, 1);
        renderLinksEditor();
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
    const statusEl = $("#links-status");
    statusEl.hidden = false;
    statusEl.className = "status";
    statusEl.textContent = "Saving...";

    try {
      const res = await fetch("/api/save-data", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(siteData),
      });
      if (!res.ok) throw new Error("Save failed");
      statusEl.textContent = "Saved! Site will redeploy shortly.";
    } catch (err) {
      statusEl.className = "status error";
      statusEl.textContent = "Error saving: " + err.message;
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

  $("#image-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      // Crop to square center
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      selectedImageBase64 = dataUrl.split(",")[1];

      // Update preview
      const preview = $("#avatar-preview");
      preview.textContent = "";
      preview.style.backgroundImage = `url(${dataUrl})`;
      $("#upload-image").disabled = false;
    };
    img.src = URL.createObjectURL(file);
  });

  $("#upload-image").addEventListener("click", async () => {
    if (!selectedImageBase64) return;
    const btn = $("#upload-image");
    btn.disabled = true;
    btn.textContent = "Uploading...";

    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ imageBase64: selectedImageBase64 }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      siteData.image = data.image;
      btn.textContent = "Uploaded!";
      selectedImageBase64 = null;
    } catch (err) {
      btn.textContent = "Upload failed";
    }

    setTimeout(() => {
      btn.textContent = "Upload Image";
      btn.disabled = !selectedImageBase64;
    }, 2000);
  });

  $("#save-profile").addEventListener("click", async () => {
    siteData.name = $("#profile-name").value;
    siteData.bio = $("#profile-bio").value;

    const statusEl = $("#profile-status");
    statusEl.hidden = false;
    statusEl.className = "status";
    statusEl.textContent = "Saving...";

    try {
      const res = await fetch("/api/save-data", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(siteData),
      });
      if (!res.ok) throw new Error("Save failed");
      statusEl.textContent = "Saved! Site will redeploy shortly.";
    } catch (err) {
      statusEl.className = "status error";
      statusEl.textContent = "Error saving: " + err.message;
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
