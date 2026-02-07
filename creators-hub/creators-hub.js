const STORAGE_KEY = "creatorsHubProfiles";
const SESSION_KEY = "creatorsHubSession";

const DEFAULT_BADGES = {
  studioLevel: 1,
  workshopLevel: 1,
  labLevel: 1,
  officeLevel: 1
};

const DEFAULT_LICENSE = {
  licenseActive: false,
  licensedBuildings: [],
  licensedMaxLevel: 1,
  startAt: null,
  endAt: null
};

const PLATFORM_OPTIONS = [
  "Website",
  "Instagram",
  "YouTube",
  "TikTok",
  "X",
  "LinkedIn",
  "Behance",
  "Dribbble",
  "GitHub",
  "Newsletter"
];

const DEFAULT_PALETTE = ["#101820", "#f7f7fb", "#ff7a59", "#2b2bff", "#39c6f0"];

function loadProfiles() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch (error) {
    console.warn("[CreatorsHub] Failed to parse profiles.", error);
    return {};
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentProfile() {
  const session = getSession();
  if (!session || !session.username) return null;
  const profiles = loadProfiles();
  return profiles[session.username] || null;
}

function updateProfile(username, data) {
  const profiles = loadProfiles();
  profiles[username] = { ...profiles[username], ...data, updatedAt: new Date().toISOString() };
  saveProfiles(profiles);
}

function buildBadgeStats(profile) {
  const badges = profile.badges || DEFAULT_BADGES;
  const overallLevel = Object.values(badges).reduce((sum, value) => sum + Number(value || 0), 0);
  return { ...badges, overallLevel };
}

function renderBadgeGrid(container, profile) {
  const stats = buildBadgeStats(profile);
  container.innerHTML = `
    <div class="hub-badge"><strong>${stats.studioLevel}</strong>Studio</div>
    <div class="hub-badge"><strong>${stats.workshopLevel}</strong>Workshop</div>
    <div class="hub-badge"><strong>${stats.labLevel}</strong>Lab</div>
    <div class="hub-badge"><strong>${stats.officeLevel}</strong>Office</div>
    <div class="hub-badge"><strong>${stats.overallLevel}</strong>Overall</div>
  `;
}

function hydratePlatformSelects() {
  document.querySelectorAll("select[data-platform-select]").forEach((select) => {
    if (select.options.length === 0) {
      PLATFORM_OPTIONS.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
      });
    }
  });
}

function createDefaultProfile({ email, username, displayName, password }) {
  const now = new Date().toISOString();
  return {
    id: `${username}-${Date.now()}`,
    email,
    username,
    displayName: displayName || username,
    password,
    bio: "",
    avatarType: "initials",
    avatarUrl: "",
    avatarColor: "#111111",
    links: Array.from({ length: 5 }).map(() => ({ platform: "Website", url: "" })),
    primaryLogoUrl: "",
    secondaryLogoUrl: "",
    palette: DEFAULT_PALETTE,
    badges: DEFAULT_BADGES,
    license: DEFAULT_LICENSE,
    workspaceNotes: "",
    labInterests: "",
    officeTemplates: {},
    createdAt: now,
    updatedAt: now
  };
}

function setStatus(el, message, tone = "") {
  if (!el) return;
  el.textContent = message;
  el.className = tone ? `hub-status ${tone}` : "hub-status";
}

async function sendSignupNotification(payload) {
  try {
    const response = await fetch("/functions/api/creators-hub-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (error) {
    console.warn("[CreatorsHub] Failed to send admin notification.", error);
    return false;
  }
}

function handleAuth() {
  const authCard = document.querySelector("[data-hub-auth]");
  if (!authCard) return;

  const signupForm = authCard.querySelector("[data-signup-form]");
  const loginForm = authCard.querySelector("[data-login-form]");
  const statusEl = authCard.querySelector("[data-auth-status]");
  const loggedInPanel = authCard.querySelector("[data-auth-session]");

  const session = getSession();
  if (session && session.username) {
    loggedInPanel.innerHTML = `Signed in as <strong>${session.username}</strong>`;
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(signupForm);
      const email = String(formData.get("email") || "").trim();
      const username = String(formData.get("username") || "").trim().toLowerCase();
      const displayName = String(formData.get("displayName") || "").trim();
      const password = String(formData.get("password") || "").trim();

      if (!email || !username || !password) {
        setStatus(statusEl, "Email, username, and password are required.");
        return;
      }

      const profiles = loadProfiles();
      if (profiles[username]) {
        setStatus(statusEl, "That username is already taken.");
        return;
      }

      const profile = createDefaultProfile({ email, username, displayName, password });
      profiles[username] = profile;
      saveProfiles(profiles);
      setSession({ username, email });
      loggedInPanel.innerHTML = `Signed in as <strong>${username}</strong>`;

      const notificationPayload = {
        email,
        username,
        displayName,
        path: window.location.pathname,
        userAgent: navigator.userAgent
      };

      const notified = await sendSignupNotification(notificationPayload);
      const message = notified
        ? "Account created. Admin notified."
        : "Account created. Admin notification pending.";
      setStatus(statusEl, message);
      signupForm.reset();
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const username = String(formData.get("username") || "").trim().toLowerCase();
      const password = String(formData.get("password") || "").trim();
      const profiles = loadProfiles();
      const profile = profiles[username];
      if (!profile || profile.password !== password) {
        setStatus(statusEl, "Invalid username or password.");
        return;
      }
      setSession({ username, email: profile.email });
      loggedInPanel.innerHTML = `Signed in as <strong>${username}</strong>`;
      setStatus(statusEl, "Welcome back.");
      loginForm.reset();
    });
  }

  const logoutBtn = authCard.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      loggedInPanel.textContent = "Signed out.";
      setStatus(statusEl, "Logged out.");
    });
  }
}

function hydrateStudio() {
  const studio = document.querySelector("[data-hub-studio]");
  if (!studio) return;
  hydratePlatformSelects();

  const profile = getCurrentProfile();
  const form = studio.querySelector("[data-profile-form]");
  const status = studio.querySelector("[data-profile-status]");
  const badgeGrid = studio.querySelector("[data-badge-grid]");
  const badgeGridAlt = studio.querySelector("[data-badge-grid-alt]");
  const supporterButton = studio.querySelector("[data-supporter-toggle]");
  const supporterPanel = studio.querySelector("[data-supporter-panel]");
  const memberLink = studio.querySelector("[data-member-link]");

  if (!profile) {
    studio.querySelector("[data-profile-locked]").classList.remove("hidden");
    if (form) form.classList.add("hidden");
    return;
  }

  studio.querySelector("[data-profile-locked]").classList.add("hidden");
  if (form) form.classList.remove("hidden");

  if (badgeGrid) renderBadgeGrid(badgeGrid, profile);
  if (badgeGridAlt) renderBadgeGrid(badgeGridAlt, profile);
  if (memberLink) memberLink.href = `/creators-hub/members/${profile.username}`;

  if (supporterButton && supporterPanel) {
    supporterButton.addEventListener("click", () => {
      supporterPanel.classList.toggle("hidden");
    });
  }

  if (form) {
    form.querySelector("[name=displayName]").value = profile.displayName || "";
    form.querySelector("[name=bio]").value = profile.bio || "";
    form.querySelector("[name=avatarType]").value = profile.avatarType || "initials";
    form.querySelector("[name=avatarUrl]").value = profile.avatarUrl || "";
    form.querySelector("[name=avatarColor]").value = profile.avatarColor || "#111111";
    form.querySelector("[name=primaryLogoUrl]").value = profile.primaryLogoUrl || "";
    form.querySelector("[name=secondaryLogoUrl]").value = profile.secondaryLogoUrl || "";

    const paletteInputs = form.querySelectorAll("[data-palette-input]");
    paletteInputs.forEach((input, index) => {
      input.value = profile.palette[index] || "";
    });

    const linkRows = form.querySelectorAll("[data-link-row]");
    linkRows.forEach((row, index) => {
      const link = profile.links[index] || { platform: "Website", url: "" };
      const select = row.querySelector("select");
      const input = row.querySelector("input");
      if (select) select.value = link.platform || "Website";
      if (input) input.value = link.url || "";
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const updated = {
        displayName: String(data.get("displayName") || "").trim(),
        bio: String(data.get("bio") || "").trim(),
        avatarType: String(data.get("avatarType") || "initials").trim(),
        avatarUrl: String(data.get("avatarUrl") || "").trim(),
        avatarColor: String(data.get("avatarColor") || "#111111").trim(),
        primaryLogoUrl: String(data.get("primaryLogoUrl") || "").trim(),
        secondaryLogoUrl: String(data.get("secondaryLogoUrl") || "").trim()
      };

      const links = Array.from(form.querySelectorAll("[data-link-row]")).map((row) => ({
        platform: row.querySelector("select").value,
        url: row.querySelector("input").value.trim()
      }));

      const palette = Array.from(form.querySelectorAll("[data-palette-input]")).map((input) => input.value.trim());

      updateProfile(profile.username, {
        ...updated,
        links,
        palette
      });

      setStatus(status, "Profile saved.");
    });
  }
}

function hydrateMemberPage() {
  const memberRoot = document.querySelector("[data-member-page]");
  if (!memberRoot) return;

  const path = window.location.pathname;
  const username = decodeURIComponent(path.split("/creators-hub/members/")[1] || "").replace(/\/+$/, "");
  const profiles = loadProfiles();
  const profile = profiles[username];

  const emptyState = memberRoot.querySelector("[data-member-empty]");
  const content = memberRoot.querySelector("[data-member-content]");

  if (!profile) {
    emptyState.classList.remove("hidden");
    content.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  content.classList.remove("hidden");

  const avatar = content.querySelector("[data-member-avatar]");
  if (profile.avatarType === "url" && profile.avatarUrl) {
    avatar.innerHTML = `<img src="${profile.avatarUrl}" alt="${profile.displayName} avatar" />`;
    avatar.classList.add("hub-card");
  } else {
    avatar.style.background = profile.avatarColor || "#111111";
    avatar.textContent = (profile.displayName || profile.username || "CJ").slice(0, 2).toUpperCase();
  }

  content.querySelector("[data-member-name]").textContent = profile.displayName || profile.username;
  content.querySelector("[data-member-bio]").textContent = profile.bio || "No bio added yet.";

  const linkList = content.querySelector("[data-member-links]");
  linkList.innerHTML = "";
  profile.links.filter((link) => link.url).forEach((link) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${link.platform}:</strong> <a href="${link.url}" target="_blank" rel="noopener">${link.url}</a>`;
    linkList.appendChild(li);
  });

  const logoGrid = content.querySelector("[data-member-logos]");
  logoGrid.innerHTML = "";
  [profile.primaryLogoUrl, profile.secondaryLogoUrl].filter(Boolean).forEach((url) => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Creator logo";
    img.className = "hub-card";
    logoGrid.appendChild(img);
  });

  const paletteGrid = content.querySelector("[data-member-palette]");
  paletteGrid.innerHTML = "";
  profile.palette.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "hub-badge";
    swatch.style.background = color;
    swatch.style.color = "#fff";
    swatch.textContent = color;
    paletteGrid.appendChild(swatch);
  });

  const badgeGrid = content.querySelector("[data-badge-grid]");
  if (badgeGrid) renderBadgeGrid(badgeGrid, profile);

  const supporterBadge = content.querySelector("[data-supporter-status]");
  supporterBadge.textContent = profile.license && profile.license.licenseActive ? "Supporter Active" : "Supporter Placeholder";
}

function hydrateWorkshop() {
  const workshop = document.querySelector("[data-hub-workshop]");
  if (!workshop) return;

  const profile = getCurrentProfile();
  const notes = workshop.querySelector("[data-workshop-notes]");
  const status = workshop.querySelector("[data-workshop-status]");

  if (profile && notes) {
    notes.value = profile.workspaceNotes || "";
  }

  if (notes) {
    notes.addEventListener("input", () => {
      const current = getCurrentProfile();
      if (!current) return;
      updateProfile(current.username, { workspaceNotes: notes.value });
      setStatus(status, "Notes saved.");
    });
  }

  workshop.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.getAttribute("data-copy");
      navigator.clipboard.writeText(text || "");
      setStatus(status, "Prompt copied.");
    });
  });
}

function hydrateLab() {
  const lab = document.querySelector("[data-hub-lab]");
  if (!lab) return;

  const profile = getCurrentProfile();
  const interestInput = lab.querySelector("[data-lab-interests]");
  const status = lab.querySelector("[data-lab-status]");

  if (profile && interestInput) {
    interestInput.value = profile.labInterests || "";
  }

  if (interestInput) {
    interestInput.addEventListener("input", () => {
      const current = getCurrentProfile();
      if (!current) return;
      updateProfile(current.username, { labInterests: interestInput.value });
      setStatus(status, "Interests saved.");
    });
  }

  const searchInput = lab.querySelector("[data-lab-search]");
  const items = Array.from(lab.querySelectorAll("[data-lab-item]"));

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? "block" : "none";
      });
    });
  }
}

function hydrateOffice() {
  const office = document.querySelector("[data-hub-office]");
  if (!office) return;

  const profile = getCurrentProfile();
  const status = office.querySelector("[data-office-status]");
  const templateInputs = office.querySelectorAll("[data-template-input]");

  if (profile) {
    templateInputs.forEach((input) => {
      const key = input.getAttribute("data-template-input");
      input.value = (profile.officeTemplates && profile.officeTemplates[key]) || "";
    });
  }

  templateInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const current = getCurrentProfile();
      if (!current) return;
      const key = input.getAttribute("data-template-input");
      const nextTemplates = { ...(current.officeTemplates || {}), [key]: input.value };
      updateProfile(current.username, { officeTemplates: nextTemplates });
      setStatus(status, "Templates saved.");
    });
  });

  const exportJson = office.querySelector("[data-export-json]");
  const exportTxt = office.querySelector("[data-export-txt]");

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (exportJson) {
    exportJson.addEventListener("click", () => {
      const current = getCurrentProfile();
      if (!current) return;
      const payload = current.officeTemplates || {};
      download("creators-hub-office.json", JSON.stringify(payload, null, 2), "application/json");
      setStatus(status, "Exported JSON.");
    });
  }

  if (exportTxt) {
    exportTxt.addEventListener("click", () => {
      const current = getCurrentProfile();
      if (!current) return;
      const payload = current.officeTemplates || {};
      const text = Object.entries(payload)
        .map(([key, value]) => `${key.toUpperCase()}\n${value}`)
        .join("\n\n");
      download("creators-hub-office.txt", text, "text/plain");
      setStatus(status, "Exported TXT.");
    });
  }
}

function hydrateDashboard() {
  const dashboard = document.querySelector("[data-hub-dashboard]");
  if (!dashboard) return;

  const badgeGrid = dashboard.querySelector("[data-badge-grid]");
  const profile = getCurrentProfile() || createDefaultProfile({
    email: "",
    username: "guest",
    displayName: "Guest",
    password: ""
  });
  if (badgeGrid) renderBadgeGrid(badgeGrid, profile);
}

function init() {
  handleAuth();
  hydrateStudio();
  hydrateMemberPage();
  hydrateWorkshop();
  hydrateLab();
  hydrateOffice();
  hydrateDashboard();
  // TODO Phase 1/2: timers, hourglasses, and level unlock systems.
}

document.addEventListener("DOMContentLoaded", init);
