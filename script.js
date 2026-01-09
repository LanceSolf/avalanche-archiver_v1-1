document.addEventListener('DOMContentLoaded', () => {
    console.log('Avalanche Bulletin Archive Loaded');

    // Add simple interaction for problem cards
    const cards = document.querySelectorAll('.problem-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('highlighted');
        });
    });
});
