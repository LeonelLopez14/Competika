const paragraph = document.querySelector('.info-paragraph');

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            paragraph.classList.add('animate');
            observer.unobserve(paragraph);
        } 
    });
} , {
    threshold: 0.1
});

observer.observe(paragraph);