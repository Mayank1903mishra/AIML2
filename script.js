// =============================================
// 🎵 GrooveBox — Professional Music Player JS
// =============================================


// ===========================
// SONG DATABASE
// ===========================


const songs = [

  {
    title: "C Walk",
    artist: "KARAN AUJLA",
    emoji: "😎",
    src: "C Walk.mp3"
  },


  {
    title: "Daang",
    artist: "GIPPY",
    emoji: "🎙️",
    src: "Daang.mp3"
  },


  {
    title: "Barota",
    artist: "Punjabi Hits",
    emoji: "🔥",
    src: "Barota.mp3"
  },


  {
    title: "FIFA 2026",
    artist: "WORLD CHAMPIONS",
    emoji: "⚽",
    src: "FIFA.mp3"
  }

];




// ===========================
// HTML ELEMENTS
// ===========================


const audioPlayer = document.getElementById("audioPlayer");

const playPauseBtn = document.getElementById("playPauseBtn");

const prevBtn = document.getElementById("prevBtn");

const nextBtn = document.getElementById("nextBtn");


const songTitle = document.getElementById("songTitle");

const artistName = document.getElementById("artistName");


const albumArt = document.getElementById("albumArt");


const progressBar = document.getElementById("progressBar");

const progressFill = document.getElementById("progressFill");


const currentTimeEl = document.getElementById("currentTime");

const totalTimeEl = document.getElementById("totalTime");


const volumeSlider = document.getElementById("volumeSlider");


const playlist = document.getElementById("playlist");




// ===========================
// PLAYER VARIABLES
// ===========================


let currentIndex = 0;

let isPlaying = false;




// ===========================
// CREATE PLAYLIST
// ===========================


function buildPlaylist(){


playlist.innerHTML="";


songs.forEach((song,index)=>{


const li=document.createElement("li");


li.dataset.index=index;



li.innerHTML=`

<div class="song-emoji">

${song.emoji}

</div>


<div class="song-info-small">

<span class="s-title">

${song.title}

</span>


<span class="s-artist">

${song.artist}

</span>


</div>

`;



li.addEventListener("click",()=>{


currentIndex=index;


loadSong(currentIndex);


playSong();


});



playlist.appendChild(li);



});


}







// ===========================
// LOAD SONG
// ===========================


function loadSong(index){


const song=songs[index];


songTitle.textContent=song.title;


artistName.textContent=song.artist;


albumArt.textContent=song.emoji;



audioPlayer.src=song.src;



progressFill.style.width="0%";


currentTimeEl.textContent="0:00";


highlightActive(index);



}






// ===========================
// ACTIVE SONG UI
// ===========================


function highlightActive(index){


const items=playlist.querySelectorAll("li");


items.forEach(item=>{


item.classList.remove("active");


});



if(items[index]){


items[index].classList.add("active");


}


}







// ===========================
// PLAY SONG
// ===========================


function playSong(){


audioPlayer.play();


isPlaying=true;



playPauseBtn.innerHTML="❚❚";


albumArt.classList.add("playing");


}




// ===========================
// PAUSE SONG
// ===========================


function pauseSong(){


audioPlayer.pause();


isPlaying=false;



playPauseBtn.innerHTML="▶";


albumArt.classList.remove("playing");



}




// ===========================
// PLAY / PAUSE BUTTON
// ===========================


playPauseBtn.addEventListener("click",()=>{


if(isPlaying){

pauseSong();

}

else{

playSong();

}


});







// ===========================
// NEXT SONG
// ===========================


nextBtn.addEventListener("click",()=>{


currentIndex++;


if(currentIndex>=songs.length){

currentIndex=0;

}


loadSong(currentIndex);


playSong();



});






// ===========================
// PREVIOUS SONG
// ===========================


prevBtn.addEventListener("click",()=>{


currentIndex--;


if(currentIndex<0){

currentIndex=songs.length-1;

}


loadSong(currentIndex);


playSong();



});








// ===========================
// AUTO NEXT SONG
// ===========================


audioPlayer.addEventListener("ended",()=>{


currentIndex++;


if(currentIndex>=songs.length){

currentIndex=0;

}


loadSong(currentIndex);


playSong();



});







// ===========================
// PROGRESS UPDATE
// ===========================


audioPlayer.addEventListener("timeupdate",()=>{


const current=audioPlayer.currentTime;


const duration=audioPlayer.duration;



if(duration){


let percent=(current/duration)*100;



progressFill.style.width=
percent+"%";



currentTimeEl.textContent=
formatTime(current);



totalTimeEl.textContent=
formatTime(duration);



}



});







function formatTime(seconds){


const min=Math.floor(seconds/60);


const sec=Math.floor(seconds%60);



return min+":"+(sec<10?"0":"")+sec;


}







// ===========================
// SEEK FUNCTION
// ===========================


progressBar.addEventListener("click",(e)=>{


const width=progressBar.offsetWidth;


const click=e.offsetX;


const duration=audioPlayer.duration;



if(duration){


audioPlayer.currentTime=
(click/width)*duration;


}


});







// ===========================
// VOLUME CONTROL
// ===========================


volumeSlider.addEventListener("input",()=>{


audioPlayer.volume=
volumeSlider.value;



});



audioPlayer.volume=
volumeSlider.value;








// ===========================
// INITIALIZE PLAYER
// ===========================


buildPlaylist();


loadSong(0);