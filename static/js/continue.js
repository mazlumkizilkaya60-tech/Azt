
(function(){

function saveProgress(cfg,video){
    if(!cfg || !cfg.itemId) return;
    fetch("/continue",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            id:cfg.itemId,
            title:cfg.title,
            pos:Math.floor(video.currentTime||0),
            mode:cfg.mode
        })
    });
}

window.attachContinueWatching=function(video,cfg){
    setInterval(function(){
        if(video && !video.paused){
            saveProgress(cfg,video);
        }
    },5000);
}

})();
