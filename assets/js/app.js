const table = document.getElementById("coverageTable");
const thead = table.querySelector("thead");
const tbody = table.querySelector("tbody");

const columnControls = document.getElementById("columnControls");
const drugControls = document.getElementById("drugControls");
const searchInput = document.getElementById("search");

let data = [];
let currentSort = null;
let sortDirection = "asc";

const defaultColumns = [
    "name",
    "class",
    "route",
    "mrsa",
    "mssa",
    "streptococcus",
    "enterococcus",
    "vre",
    "gram_negative",
    "pseudomonas",
    "anaerobes",
    "atypicals",
    "esbl",
    "cre",
    "first_line_for",
    "renal_adjustment",
    "qt_prolongation",
    "notes"
];

const optionalColumns = [
    "ampc",
    "combo_required",
    "bioavailability",
    "c_diff_risk",
    "pregnancy_safe"
];

const allColumns = [...defaultColumns, ...optionalColumns];

const defaultDrugs = [
    "Vancomycin",
    "Linezolid",
    "Daptomycin",
    "Cefepime",
    "Ceftriaxone",
    "Piperacillin-Tazobactam",
    "Meropenem",
    "Ertapenem",
    "Metronidazole",
    "Trimethoprim-Sulfamethoxazole",
    "Amoxicillin-Clavulanate",
    "Cefazolin",
    "Ampicillin",
    "Doxycycline",
    "Ceftazidime-Avibactam",
    "Ceftaroline",
    "Dalbavancin",
    "Gentamicin",
    "Nitrofurantoin"
];

const coverageColumns = [
    "mrsa",
    "mssa",
    "streptococcus",
    "enterococcus",
    "vre",
    "gram_negative",
    "pseudomonas",
    "anaerobes",
    "atypicals",
    "esbl",
    "cre",
    "ampc"
];

function saveSetting(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function loadSetting(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function getVisibleColumns() {
    return loadSetting("visibleColumns", defaultColumns);
}

function getVisibleDrugs() {
    return loadSetting("visibleDrugs", defaultDrugs);
}

function pretty(text) {
    return text
        .replaceAll("_", " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

function badge(value) {

    if (value === true) {
        return `<span class="yes">✓</span>`;
    }

    if (value === false) {
        return `<span class="no">✕</span>`;
    }

    if (value === "partial" || value === "limited") {
        return `<span class="partial">${value}</span>`;
    }

    return value;
}

function formatValue(value) {

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    if (
        value === true ||
        value === false ||
        value === "partial" ||
        value === "limited"
    ) {
        return badge(value);
    }

    return value ?? "";
}

function normalizeSearch(text) {
    return text
        .toLowerCase()
        .trim()
        .replaceAll("-", "_")
        .replaceAll(" ", "_");
}

function matchesCoverageSearch(row, search) {

    const map = {
        mrsa: "mrsa",
        mssa: "mssa",
        streptococcus: "streptococcus",
        strep: "streptococcus",
        enterococcus: "enterococcus",
        vre: "vre",
        gram_negative: "gram_negative",
        gramnegative: "gram_negative",
        gramnegativecoverage: "gram_negative",
        pseudomonas: "pseudomonas",
        anaerobes: "anaerobes",
        anaerobe: "anaerobes",
        atypicals: "atypicals",
        atypical: "atypicals",
        esbl: "esbl",
        cre: "cre",
        ampc: "ampc"
    };

    const column = map[search];

    if (!column) return false;

    return row[column] === true;
}

function matchesOtherSearch(row, search) {

    if (row.name.toLowerCase().includes(search)) {
        return true;
    }

    if (
        row.class &&
        row.class.toLowerCase().includes(search)
    ) {
        return true;
    }

    if (
        row.notes &&
        row.notes.toLowerCase().includes(search)
    ) {
        return true;
    }

    if (
        row.first_line_for &&
        row.first_line_for.join(" ").toLowerCase().includes(search)
    ) {
        return true;
    }

    if (
        search === "renal" ||
        search === "renal_adjustment"
    ) {
        return row.renal_adjustment === true;
    }

    if (
        search === "qt" ||
        search === "qt_prolongation"
    ) {
        return row.qt_prolongation === true;
    }

    if (
        search === "combo" ||
        search === "combo_required"
    ) {
        return row.combo_required === true;
    }

    return false;
}

function buildTable() {

    const visibleColumns = getVisibleColumns();
    const visibleDrugs = getVisibleDrugs();

    let rows = data.filter(
        row => visibleDrugs.includes(row.name)
    );

    const search = normalizeSearch(searchInput.value);

    if (search) {

        rows = rows.filter(row => {

            if (matchesCoverageSearch(row, search)) {
                return true;
            }

            return matchesOtherSearch(row, search);
        });
    }

    if (currentSort) {

        rows.sort((a, b) => {

            let av = a[currentSort];
            let bv = b[currentSort];

            if (Array.isArray(av)) av = av.join(", ");
            if (Array.isArray(bv)) bv = bv.join(", ");

            av = String(av ?? "");
            bv = String(bv ?? "");

            const result = av.localeCompare(
                bv,
                undefined,
                { sensitivity: "base" }
            );

            return sortDirection === "asc"
                ? result
                : -result;
        });
    }

    thead.innerHTML = "";
    tbody.innerHTML = "";

    const headerRow = document.createElement("tr");

    visibleColumns.forEach(column => {

        const th = document.createElement("th");

        th.textContent =
            pretty(column) +
            (currentSort === column
                ? (sortDirection === "asc" ? " ▲" : " ▼")
                : "");

        th.style.cursor = "pointer";

        th.addEventListener("click", () => {

            if (currentSort === column) {
                sortDirection =
                    sortDirection === "asc"
                        ? "desc"
                        : "asc";
            } else {
                currentSort = column;
                sortDirection = "asc";
            }

            buildTable();
        });

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    rows.forEach(row => {

        const tr = document.createElement("tr");

        visibleColumns.forEach(column => {

            const td = document.createElement("td");

            if (column === "notes") {
                td.classList.add("notes");
            }

            td.innerHTML = formatValue(row[column]);

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function buildColumnControls() {

    const visibleColumns = getVisibleColumns();

    columnControls.innerHTML = "";

    allColumns.forEach(column => {

        const label = document.createElement("label");

        label.innerHTML = `
            <input
                type="checkbox"
                ${visibleColumns.includes(column) ? "checked" : ""}
            >
            ${pretty(column)}
        `;

        const checkbox =
            label.querySelector("input");

        checkbox.addEventListener("change", () => {

            let columns = getVisibleColumns();

            if (checkbox.checked) {

                if (!columns.includes(column)) {
                    columns.push(column);
                }

            } else {

                columns = columns.filter(
                    c => c !== column
                );
            }

            saveSetting(
                "visibleColumns",
                columns
            );

            buildTable();
        });

        columnControls.appendChild(label);
    });
}

function buildDrugControls() {

    const visibleDrugs = getVisibleDrugs();

    drugControls.innerHTML = "";

    const sorted = [...data].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    sorted.forEach(drug => {

        const label = document.createElement("label");

        label.innerHTML = `
            <input
                type="checkbox"
                ${visibleDrugs.includes(drug.name)
                    ? "checked"
                    : ""
                }
            >
            ${drug.name}
        `;

        const checkbox =
            label.querySelector("input");

        checkbox.addEventListener("change", () => {

            let drugs = getVisibleDrugs();

            if (checkbox.checked) {

                if (!drugs.includes(drug.name)) {
                    drugs.push(drug.name);
                }

            } else {

                drugs = drugs.filter(
                    d => d !== drug.name
                );
            }

            saveSetting(
                "visibleDrugs",
                drugs
            );

            buildTable();
        });

        drugControls.appendChild(label);
    });
}

function addResetButton() {

    const btn = document.createElement("button");

    btn.textContent = "Reset Defaults";

    btn.style.marginTop = "10px";

    btn.addEventListener("click", () => {

        localStorage.removeItem(
            "visibleColumns"
        );

        localStorage.removeItem(
            "visibleDrugs"
        );

        buildColumnControls();
        buildDrugControls();
        buildTable();
    });

    document
        .querySelector(".controls")
        .appendChild(btn);
}

searchInput.addEventListener(
    "input",
    buildTable
);

async function loadData() {

    const response =
        await fetch("coverage.json");

    data = await response.json();

    buildColumnControls();
    buildDrugControls();
    addResetButton();
    buildTable();
}

loadData();
