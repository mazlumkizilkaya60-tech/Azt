
(function(){

function attachFailover(video, cfg){
    if(!cfg || !cfg.backups) return
    video.addEventListener("error", function(){
        if(cfg.backups.length){
            var next = cfg.backups.shift()
            video.src = next
            video.play()
        }
    })
}

window.attachUltraPlayer=function(video,cfg){
    attachFailover(video,cfg)
}

})();
