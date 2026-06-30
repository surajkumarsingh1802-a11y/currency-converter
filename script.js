// Currency Converter Logic
// Uses the free exchangerate-api.com endpoint (no API key required for this open endpoint)

const API_BASE = "https://open.er-api.com/v6/latest/";

const form = document.getElementById("converter-form");
const amountInput = document.getElementById("amount");
const fromSelect = document.getElementById("from-currency");
const toSelect = document.getElementById("to-currency");
const swapBtn = document.getElementById("swap-btn");
const convertBtn = document.getElementById("convert-btn");
const resultBox = document.getElementById("result-box");
const resultText = document.getElementById("result-text");
const rateText = document.getElementById("rate-text");
const statusText = document.getElementById("status-text");

// Common currencies shown first, then the rest alphabetically
const PRIORITY_CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "CNY", "SGD", "AED"];

let ratesCache = {}; // { BASE_CURRENCY: { rates, timestamp } }

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function populateCurrencyDropdowns(currencyCodes) {
  const sorted = [
    ...PRIORITY_CURRENCIES.filter((c) => currencyCodes.includes(c)),
    ...currencyCodes.filter((c) => !PRIORITY_CURRENCIES.includes(c)).sort(),
  ];

  [fromSelect, toSelect].forEach((select) => {
    select.innerHTML = "";
    sorted.forEach((code) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = code;
      select.appendChild(option);
    });
  });

  fromSelect.value = "USD";
  toSelect.value = "INR";
}

async function fetchRates(baseCurrency) {
  if (ratesCache[baseCurrency] && Date.now() - ratesCache[baseCurrency].timestamp < 1000 * 60 * 30) {
    return ratesCache[baseCurrency].rates;
  }

  const response = await fetch(`${API_BASE}${baseCurrency}`);
  if (!response.ok) {
    throw new Error("Failed to fetch exchange rates");
  }
  const data = await response.json();
  if (data.result !== "success") {
    throw new Error("Exchange rate API returned an error");
  }

  ratesCache[baseCurrency] = {
    rates: data.rates,
    timestamp: Date.now(),
  };

  return data.rates;
}

async function initCurrencies() {
  try {
    setStatus("Loading currencies...");
    const rates = await fetchRates("USD");
    populateCurrencyDropdowns(Object.keys(rates));
    setStatus("");
  } catch (err) {
    setStatus("Could not load currency list. Please refresh.", true);
    convertBtn.disabled = true;
  }
}

async function handleConvert(event) {
  event.preventDefault();

  const amount = parseFloat(amountInput.value);
  const from = fromSelect.value;
  const to = toSelect.value;

  if (isNaN(amount) || amount < 0) {
    setStatus("Please enter a valid amount.", true);
    return;
  }

  convertBtn.disabled = true;
  convertBtn.textContent = "Converting...";
  setStatus("");

  try {
    const rates = await fetchRates(from);
    const rate = rates[to];

    if (!rate) {
      throw new Error(`No rate found for ${to}`);
    }

    const converted = amount * rate;

    resultText.textContent = `${amount.toLocaleString()} ${from} = ${converted.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })} ${to}`;
    rateText.textContent = `1 ${from} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${to}`;
    resultBox.classList.remove("hidden");
  } catch (err) {
    setStatus("Conversion failed. Please try again.", true);
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert";
  }
}

function swapCurrencies() {
  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;

  // Re-run conversion automatically if a result is already showing
  if (!resultBox.classList.contains("hidden")) {
    form.requestSubmit();
  }
}

form.addEventListener("submit", handleConvert);
swapBtn.addEventListener("click", swapCurrencies);

initCurrencies();
