
(function(){

function renderContinueRail(container,data){
    if(!container) return
    container.innerHTML=""
    data.forEach(function(item){
        var el=document.createElement("div")
        el.className="continue-card"
        el.innerText=item.title
        container.appendChild(el)
    })
}

window.loadContinueRail=function(){
    fetch("/continue")
      .then(r=>r.json())
      .then(function(data){
          var rail=document.getElementById("continueRail")
          renderContinueRail(rail,data)
      })
}

document.addEventListener("DOMContentLoaded",loadContinueRail)

})();
