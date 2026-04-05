let toastTimeout = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 1500);
}

async function copyToClipboard(text, cell) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied: " + (text.length > 40 ? text.substring(0, 40) + "..." : text));
    if (cell) {
      cell.classList.add("copied");
      setTimeout(() => cell.classList.remove("copied"), 300);
    }
  } catch {
    // Fallback for non-HTTPS / file:// contexts
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Copied: " + (text.length > 40 ? text.substring(0, 40) + "..." : text));
    if (cell) {
      cell.classList.add("copied");
      setTimeout(() => cell.classList.remove("copied"), 300);
    }
  }
}

function copyRow(row) {
  const cells = row.querySelectorAll("td:not(.action-cell)");
  const values = Array.from(cells).map(td => td.getAttribute("data-copy") || td.textContent.trim());
  copyToClipboard(values.join("\t"), null);
}
