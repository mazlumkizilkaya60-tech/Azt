
(function(){

function attachHLS(video,url){
    if(video.canPlayType('application/vnd.apple.mpegurl')){
        video.src = url
    }else if(window.Hls){
        var hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(video)
    }else{
        video.src = url
    }
}

window.attachHLSPlayer = attachHLS

})();
