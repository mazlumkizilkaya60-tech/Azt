
(function(){

function attachRetry(video,cfg){
    let retryCount=0
    const maxRetry=3

    video.addEventListener("error",function(){
        if(retryCount>=maxRetry) return
        retryCount++
        console.log("Stream retry",retryCount)

        setTimeout(function(){
            video.load()
            video.play().catch(()=>{})
        },1500)
    })
}

window.attachNexusRetry = attachRetry

})();
