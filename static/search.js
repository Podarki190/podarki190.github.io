const input = document.getElementById('search');
const cards = document.querySelectorAll('.card');

input.addEventListener('input', () => {
  const q = input.value.trim().toLowerCase();
  for (const card of cards) {
    card.style.display = card.dataset.name.includes(q) ? '' : 'none';
  }
});
