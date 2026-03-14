
(function(){

function renderEPG(channel, data){

    const container = document.getElementById("epgTimeline")
    if(!container) return

    container.innerHTML=""

    const now=document.createElement("div")
    now.className="epg-now"
    now.innerText="NOW: "+(data.now||"")

    const next=document.createElement("div")
    next.className="epg-next"
    next.innerText="NEXT: "+(data.next||"")

    container.appendChild(now)
    container.appendChild(next)
}

window.loadEPG=function(channel){
    fetch("/api/epg/"+channel)
      .then(r=>r.json())
      .then(d=>renderEPG(channel,d))
}

})();
