
(function(){

function render(items){
    const rail=document.getElementById("nexusContinueRail")
    if(!rail) return

    const body=rail.querySelector(".rail__body")
    body.innerHTML=""

    items.forEach(function(i){

        const el=document.createElement("article")
        el.className="poster-card selector"
        el.dataset.action="play"
        el.dataset.mode=i.mode
        el.dataset.id=i.id
        el.dataset.title=i.title

        el.innerHTML=`
            <div class="poster-card__meta">
              <div class="poster-card__title">${i.title}</div>
              <div class="poster-card__sub">Devam: ${i.pos}s</div>
            </div>
        `

        body.appendChild(el)

    })

    rail.hidden=false
}

fetch("/api/continue")
.then(r=>r.json())
.then(d=>render(d.items||[]))

})();
