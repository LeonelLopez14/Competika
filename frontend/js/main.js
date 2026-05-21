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

const observerCompetika = new IntersectionObserver((entries) => {
    entries.forEach((entry)=>{
        if(entry.isIntersecting) {
            console.log(entry.target)
            entry.target.classList.add('show')
        } else {
            entry.target.classList.remove('show')
        }
    })
}, {
    threshold: 0.1
})

const competika = document.querySelector('.info-h1');

if (competika) {
    observerCompetika.observe(competika);
}

const observerBackground = new IntersectionObserver((entries) => {
    entries.forEach((entry)=>{
        if(entry.isIntersecting) {
            entry.target.classList.add('animate')
        } else {
            entry.target.classList.remove('animate')
        }
    })
}, {
    threshold: 0.1
})
