const SPREADSHEET_ID = "YOUR_SHEET_ID_HERE";

const URL_ADDR = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Adressen`;
const URL_EVT  = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Events`;

let addresses = [];
let events = [];

let map;
let marker;

async function loadData() {
  const [a, e] = await Promise.all([
    fetchCSV(URL_ADDR),
    fetchCSV(URL_EVT)
  ]);

  addresses = a;
  events = e;
}

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      complete: r => resolve(r.data),
      error: err => reject(err)
    });
  });
}

/* SEARCH */
document.getElementById("searchInput").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase();
  const dd = document.getElementById("dropdown");

  if (!q) {
    dd.classList.remove("open");
    return;
  }

  const results = addresses.filter(a =>
    (a.straat || "").toLowerCase().includes(q) ||
    (a.postcode || "").toLowerCase().includes(q) ||
    (a.stad || "").toLowerCase().includes(q)
  ).slice(0, 8);

  dd.innerHTML = results.map(a => `
    <div class="item" onclick="selectAddress('${a.id}')">
      <b>${a.straat} ${a.huisnummer}</b><br/>
      <small>${a.postcode} ${a.stad}</small>
    </div>
  `).join("");

  dd.classList.add("open");
});

function selectAddress(id) {
  const addr = addresses.find(a => a.id == id);
  if (!addr) return;

  document.getElementById("searchInput").value =
    `${addr.straat} ${addr.huisnummer}, ${addr.stad}`;

  document.getElementById("dropdown").classList.remove("open");

  render(addr);
}

function render(addr) {
  const related = events.filter(e => e.adres_id == addr.id);

  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>${addr.straat} ${addr.huisnummer}</h2>
      <p>${addr.postcode} ${addr.stad}</p>

      <h3>Events</h3>
      ${
        related.length
          ? related.map(e => `
              <div class="event">
                <b>${e.naam}</b><br/>
                <small>${e.datum || ""}</small><br/>
                ${e.beschrijving || ""}
              </div>
            `).join("")
          : "<p>Geen events</p>"
      }
    </div>

    <div class="card">
      <div id="map" style="height:400px;"></div>
    </div>
  `;

  setTimeout(() => {
    if (map) map.remove();

    map = L.map("map").setView([addr.lat, addr.lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(map);

    marker = L.marker([addr.lat, addr.lng]).addTo(map);
  }, 50);
}

/* INIT */
loadData();
