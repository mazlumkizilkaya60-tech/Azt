
(function(){

const box=document.getElementById("orbitSearch")

if(!box) return

box.addEventListener("input",function(){

    const q=this.value.trim()

    if(q.length<2) return

    fetch("/search?q="+encodeURIComponent(q))
      .then(r=>r.json())
      .then(function(data){

        const list=document.getElementById("orbitSearchResults")
        if(!list) return

        list.innerHTML=""

        data.results.forEach(function(item){

            const el=document.createElement("div")
            el.className="search-result selector"
            el.innerText=item.title

            list.appendChild(el)

        })

      })

})

})();
