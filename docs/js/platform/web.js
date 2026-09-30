// Website shell (index.html): wires the page buttons to the pet.
for (const id of ['think', 'dance', 'shy', 'sleep', 'noodle', 'boba', 'rose']) document.getElementById(id).onclick = () => PET.run(id);
for (const id of ['glasses', 'scarf']) {
  const btn = document.getElementById(id);
  btn.onclick = () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on);
    PET.outfit(id, on);
  };
}

