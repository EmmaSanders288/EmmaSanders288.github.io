const SPREADSHEET_ID = "1r0rv5aRsN5Y_wi-U98WHPo52vB2cteyqGxeEh-yWqDU";

const URL_ADDR =
  `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Adressen`;

const URL_EVT =
  `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Events`;

let addresses = [];
let events = [];
let map = null;

const input = document.getElementById("searchInput");
const dropdown = document.getElementById("dropdown");
const content = document.getElementById("content");

/* ---------------- LOAD DATA ---------------- */

async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data || []),
      error: (err) => reject(err),
    });
  });
}

async function loadData() {
    input.disabled = true;

    const [addr, evt] = await Promise.all([
      fetchCSV(URL_ADDR),
      fetchCSV(URL_EVT),
    ]);

    addresses = addr;
    events = evt;

    console.log("Addresses loaded:", addresses.length);
    console.log("Events loaded:", events.length);

    input.disabled = false;
    input.placeholder = "Search street, postal code or city" ;

    showEmpty();
}

/* ---------------- SEARCH ---------------- */

input.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();

  if (!q) {
    dropdown.classList.remove("open");
    return;
  }

  const results = addresses
    .filter((a) => {
      return (
        (a.straat || "").toLowerCase().includes(q) ||
        (a.postcode || "").toLowerCase().includes(q) ||
        (a.stad || "").toLowerCase().includes(q) ||
        (a.huisnummer || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  renderDropdown(results);
});

function renderDropdown(results) {
  if (!results.length) {
    dropdown.innerHTML = `<div class="item">Geen resultaten</div>`;
  } else {
    dropdown.innerHTML = results
      .map(
        (a) => `
        <div class="item" onclick="selectAddress('${a.id}')">
          <b>${a.straat || ""} ${a.huisnummer || ""}</b><br/>
          <small>${a.postcode || ""} ${a.stad || ""}</small>
        </div>
      `
      )
      .join("");
  }

  dropdown.classList.add("open");
}

/* ---------------- SELECT ADDRESS ---------------- */

function selectAddress(id) {
  const addr = addresses.find(
    (a) => String(a.id).trim() === String(id).trim()
  );

  if (!addr) return;

  input.value = `${addr.straat} ${addr.huisnummer}, ${addr.stad}`;
  dropdown.classList.remove("open");

  renderAddress(addr);
}

/* ---------------- RENDER ---------------- */

function renderAddress(addr) {
  const related = events.filter(
    (e) => String(e.adres_id).trim() === String(addr.id).trim()
  );

  const lat = parseFloat(addr.lat);
  const lng = parseFloat(addr.lng);
  const hasMap = !isNaN(lat) && !isNaN(lng);

  if (!hasMap) {
    renderNoMap(addr, related);
    return;
  }

  content.innerHTML = `
    <div class="card">
      <h2>${addr.straat || ""} ${addr.huisnummer || ""}</h2>
      <p>${addr.postcode || ""} ${addr.stad || ""}</p>

      <h3>Events (${related.length})</h3>

      ${
        related.length
          ? related
              .map(
                (e) => `
            <div class="event">
              <b>${e.naam || ""}</b><br/>
              <small>${e.datum || ""}</small><br/>
              ${e.beschrijving || ""}
            </div>
          `
              )
              .join("")
          : "<p>Geen events</p>"
      }
    </div>

    <div class="card">
      <div id="map" style="height:400px; width:100%;"></div>
    </div>
  `;

  // 🔥 FIX: ensure DOM + iframe render before Leaflet init
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (map) {
        map.remove();
        map = null;
      }

      const mapEl = document.getElementById("map");
      if (!mapEl) return;

      map = L.map(mapEl).setView([lat, lng], 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      L.marker([lat, lng]).addTo(map);

      // 🔥 critical for Google Sites / iframe rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }, 50);
  });
}

/* ---------------- NO MAP FALLBACK ---------------- */

function renderNoMap(addr, related) {
  content.innerHTML = `
    <div class="card">
      <h2>${addr.straat || ""} ${addr.huisnummer || ""}</h2>
      <p>${addr.postcode || ""} ${addr.stad || ""}</p>

      <h3>Events (${related.length})</h3>

      ${
        related.length
          ? related
              .map(
                (e) => `
            <div class="event">
              <b>${e.naam || ""}</b><br/>
              <small>${e.datum || ""}</small><br/>
              ${e.beschrijving || ""}
            </div>
          `
              )
              .join("")
          : "<p>Geen events</p>"
      }

      <p style="margin-top:10px;color:#888;">Geen coördinaten beschikbaar</p>
    </div>
  `;
}

/* ---------------- EMPTY STATE ---------------- */



/* ---------------- CLOSE DROPDOWN ---------------- */

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) {
    dropdown.classList.remove("open");
  }
});

/* ---------------- INIT ---------------- */

loadData();