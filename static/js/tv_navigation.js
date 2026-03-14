
(function(){

let current = null

function focus(el){
    if(current) current.classList.remove("focused")
    current = el
    if(current) current.classList.add("focused")
}

document.addEventListener("keydown",function(e){

    const items=[...document.querySelectorAll(".selector")]

    if(!items.length) return

    let idx = items.indexOf(current)
    if(idx<0) idx=0

    if(e.key==="ArrowRight") idx++
    if(e.key==="ArrowLeft") idx--
    if(e.key==="ArrowDown") idx+=5
    if(e.key==="ArrowUp") idx-=5

    if(idx<0) idx=0
    if(idx>=items.length) idx=items.length-1

    focus(items[idx])

    if(e.key==="Enter" && current){
        current.click()
    }

})

document.addEventListener("DOMContentLoaded",function(){
    const first=document.querySelector(".selector")
    if(first) focus(first)
})

})();
