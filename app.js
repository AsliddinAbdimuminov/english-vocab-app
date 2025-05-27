
// Boshlang'ich o'zgaruvchilar
let fullVocabulary = {};
let vocabulary = [];
let currentIndex = 0;
let recognition;
let mistakes = {};
let totalAttempts = 0;
let correctCount = 0;
let askLang = "uz";
let isStopped = false;
let retryTimer = null;
let mediaRecorder, audioChunks = [];
let shuffled = false;
let favoriteWords = JSON.parse(localStorage.getItem("favoriteWords") || "[]");
let hardWords = JSON.parse(localStorage.getItem("hardWords") || "[]");
let reviewMode = null;
let motivators = [
  "Zo'r! Davom eting!", "Barakalla!", "Ajoyib!", "Shunchaki super!", "Muvaffaqiyat!", 
  "Qoyil!", "Yashang!", "Mukammal!", "A'lo!"
];

// Speech Recognition
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
}

// Theme Toggle
document.getElementById("toggleTheme").onclick = function () {
  document.body.classList.toggle("light-mode");
};

// Shuffle
document.getElementById("shuffleBtn").onclick = function() {
  vocabulary = shuffle([...vocabulary]);
  currentIndex = 0;
  correctCount = 0;
  isStopped = false;
  mistakes = {};
  loadNextWord();
};

// Favorite
document.getElementById("favoriteBtn").onclick = function() {
  let html = "<h2>Yoqtirgan so‘zlaringiz</h2>";
  if (favoriteWords.length == 0) html += "<div>Yoqtirgan so‘zlar yo‘q</div>";
  else {
    html += "<ul>";
    favoriteWords.forEach((w,i) => {
      html += `<li><b>${w.eng}</b> – ${w.uz}</li>`;
    });
    html += "</ul>";
  }
  document.getElementById("favoritesList").innerHTML = html;
  document.getElementById("favoritesModal").classList.remove("hidden");
};
document.getElementById("closeFavoritesBtn").onclick = function() {
  document.getElementById("favoritesModal").classList.add("hidden");
};

// Stats
document.getElementById("statsBtn").onclick = function() {
  let stats = JSON.parse(localStorage.getItem("quizStats") || "{}");
  let html = "<h2>Statistika</h2>";
  html += `<b>O‘tgan testlar:</b><br>`;
  if (Object.keys(stats).length == 0) html += "Statistika yo‘q";
  else {
    html += "<ul>";
    Object.entries(stats).forEach(([date, val]) => {
      html += `<li>${date} – <b>${val}</b></li>`;
    });
    html += "</ul>";
  }
  document.getElementById("statsList").innerHTML = html;
  document.getElementById("statsModal").classList.remove("hidden");
};
document.getElementById("closeStatsBtn").onclick = function() {
  document.getElementById("statsModal").classList.add("hidden");
};

// Lug‘at (Dictionary)
document.getElementById("dictionaryBtn").onclick = function() {
  let html = "<h2>So‘zlar ro‘yxati</h2><ul>";
  vocabulary.forEach((w,i) => {
    html += `<li style="margin:6px 0;"><b>${i+1}.</b> <b>${w.eng}</b> – ${w.uz}</li>`;
  });
  html += "</ul>";
  document.getElementById("dictionaryList").innerHTML = html;
  document.getElementById("dictionaryModal").classList.remove("hidden");
};
document.getElementById("closeDictionaryBtn").onclick = function() {
  document.getElementById("dictionaryModal").classList.add("hidden");
};

// Xatolar bilan mashq qilish
document.getElementById("mistakesBtn").onclick = reviewMistakes;
function reviewMistakes() {
  // Faqat xatoli so‘zlar arrayini yig‘ib test boshlash
  let mistakeArr = Object.keys(mistakes).map(k => {
    // Format: "olma → ?" yoki "apple → ?"
    let base = k.split(" → ")[0];
    let word = vocabulary.find(w => w.uz === base || w.eng === base);
    return word;
  }).filter(Boolean);
  if (mistakeArr.length === 0) {
    alert("Xatolar yo‘q! Avval xatoli so‘zlar bo‘lishi kerak.");
    return;
  }
  vocabulary = mistakeArr;
  currentIndex = 0;
  correctCount = 0;
  mistakes = {};
  isStopped = false;
  loadNextWord();
}

// Progress Bar
function updateProgressBar() {
  const percent = vocabulary.length ? Math.round(100 * currentIndex / vocabulary.length) : 0;
  document.getElementById("progressBarFill").style.width = percent + "%";
  document.getElementById("progressText").innerText =
    `${currentIndex} / ${vocabulary.length} (${percent}%)`;
}

// Notification Sound
function playNotif() {
  try {
    const audio = document.getElementById("notifSound");
    audio.currentTime = 0;
    audio.play();
  } catch (e) {}
}

// Motivatsion fraza
function showMotivator() {
  if (correctCount > 0 && correctCount % 10 === 0) {
    let txt = motivators[Math.floor(Math.random()*motivators.length)];
    let el = document.getElementById("motivator");
    el.innerText = txt;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, 1200);
  }
}

// Audio yozib eshittirish
document.getElementById('recordBtn').onclick = function () {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio:true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = document.getElementById('userAudio');
      audio.src = audioUrl;
      audio.style.display = "block";
      audio.play();
    };
    mediaRecorder.start();
  });
};

// Boshlash
function startSession() {
  reviewMode = null;
  const level = document.getElementById("level").value;
  vocabulary = (fullVocabulary[level] || []).map(w => ({...w}));
  if (shuffled) vocabulary = shuffle(vocabulary);
  currentIndex = 0;
  correctCount = 0;
  mistakes = {};
  isStopped = false;
  document.getElementById("userAudio").style.display = "none";
  document.getElementById("resultScreen").classList.add("hidden");
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("quizScreen").classList.remove("hidden");
  loadNextWord();
}

// Stop
function stopSession() {
  isStopped = true;
  if (recognition) recognition.abort();
  clearTimeout(retryTimer);
  showResults();
}

// Shuffle helper
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// So‘z yuklash
function loadNextWord() {
  if (isStopped || currentIndex >= vocabulary.length) {
    showResults();
    return;
  }
  playNotif();
  updateProgressBar();

  const word = vocabulary[currentIndex];
  const display = askLang === "uz" ? word.uz : word.eng;
  document.getElementById("currentWord").innerHTML = `
    ${display}
    <button id="favStar" class="star-btn ${isFavorite(word) ? "" : "not-fav"}" title="Yoqtirganlar uchun belgilash">★</button>
    <button id="hardStar" class="star-btn" style="color:${isHard(word) ? 'red':'#aaa'}" title="Qiyin so‘z">!</button>
  `;
  document.getElementById("feedback").innerText = "⏺ Mikrofon ochildi, gapiring...";
  document.getElementById("userAudio").style.display = "none";
  document.getElementById("motivator").style.display = "none";
  startSpeaking();

  // Yoqtirganlar (Favorites)
  document.getElementById("favStar").onclick = function(e) {
    toggleFavorite(word);
    this.classList.toggle("not-fav");
    e.stopPropagation();
  };
  // Qiyin so‘z (Hard)
  document.getElementById("hardStar").onclick = function(e) {
    toggleHard(word);
    this.style.color = isHard(word) ? 'red' : '#aaa';
    e.stopPropagation();
  };
}

// Favorite funksiyalar
function isFavorite(word) {
  return favoriteWords.some(w => w.eng === word.eng && w.uz === word.uz);
}
function toggleFavorite(word) {
  if (isFavorite(word)) {
    favoriteWords = favoriteWords.filter(w => !(w.eng === word.eng && w.uz === word.uz));
  } else {
    favoriteWords.push(word);
  }
  localStorage.setItem("favoriteWords", JSON.stringify(favoriteWords));
}

// Hard funksiyalar
function isHard(word) {
  return hardWords.some(w => w.eng === word.eng && w.uz === word.uz);
}
function toggleHard(word) {
  if (isHard(word)) {
    hardWords = hardWords.filter(w => !(w.eng === word.eng && w.uz === word.uz));
  } else {
    hardWords.push(word);
  }
  localStorage.setItem("hardWords", JSON.stringify(hardWords));
}

// Xatolar logi
function updateMistakeLog() {
  const log = document.getElementById("mistakeLog");
  log.innerHTML = "";
  // Top 5 xato so‘zlar
  const sorted = Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sorted.length > 0) {
    const topTitle = document.createElement("div");
    topTitle.innerHTML = "<b>Eng ko‘p xato qilinganlar:</b>";
    log.appendChild(topTitle);
  }
  sorted.forEach(([key, count]) => {
    const item = document.createElement("div");
    item.className = "mistake-item";
    item.textContent = `${key} – ${count} marta`;
    log.appendChild(item);
  });
}

// Speaking
function startSpeaking() {
  const word = vocabulary[currentIndex];
  if (!recognition) return;
  document.getElementById("pulse").style.display = "block";
  recognition.start();

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    const answer = askLang === "uz" ? word.eng.toLowerCase() : word.uz.toLowerCase();
    const keyLabel = askLang === "uz" ? `${word.uz} → ?` : `${word.eng} → ?`;
    totalAttempts++;
    if (transcript === answer) {
      document.getElementById("feedback").innerText = "✅ To‘g‘ri aytdingiz!";
      document.getElementById("pulse").style.display = "none";
      correctCount++;
      showMotivator();
      setTimeout(() => { currentIndex++; loadNextWord(); }, 1000);
    } else {
      document.getElementById("feedback").innerText = `❌ Noto‘g‘ri. Siz aytdingiz: \"${transcript}\". Qaytadan urinib ko‘ring.`;
      document.getElementById("pulse").style.display = "none";
      mistakes[keyLabel] = (mistakes[keyLabel] || 0) + 1;
      updateMistakeLog();
      retryTimer = setTimeout(() => startSpeaking(), 1500);
    }
  };

  recognition.onend = function () {
    if (!isStopped) {
      document.getElementById("pulse").style.display = "none";
      document.getElementById("feedback").innerText = "⏹ Mikrofon o‘chdi. Qayta eshitilmoqda...";
      retryTimer = setTimeout(() => startSpeaking(), 2000);
    }
  };

  recognition.onerror = function () {
    document.getElementById("pulse").style.display = "none";
    document.getElementById("feedback").innerText = "⚠️ Xatolik yuz berdi. Yana urinilmoqda...";
    retryTimer = setTimeout(() => startSpeaking(), 2000);
  };
}

// Ball va yutuq
function showResults() {
  document.getElementById("quizScreen").classList.add("hidden");
  document.getElementById("resultScreen").classList.remove("hidden");
  document.getElementById("finalScore").innerText = `To‘g‘ri aytgan so‘zlaringiz: ${correctCount} / ${vocabulary.length}`;
  localStorage.setItem("lastResult", `${correctCount}/${vocabulary.length}`);

  let badge = "";
  if (correctCount >= 100) badge = "🥇 Oltin medal!";
  else if (correctCount >= 50) badge = "🥈 Kumush medal!";
  else if (correctCount >= 10) badge = "🥉 Bronza medal!";
  else badge = "🚀 Mashq qilishda davom eting!";
  document.getElementById("medalBadge").innerText = badge;

  // Statistika
  let stats = JSON.parse(localStorage.getItem("quizStats") || "{}");
  let today = new Date().toLocaleString().slice(0, 17);
  stats[today] = `${correctCount}/${vocabulary.length}`;
  localStorage.setItem("quizStats", JSON.stringify(stats));
}

// Enter key - Keyingi so‘z
document.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && document.getElementById("quizScreen").style.display !== "none") {
    if (document.getElementById("pulse").style.display === "none") {
      currentIndex++;
      loadNextWord();
    }
  }
});

// Vocabulary yuklash
fetch("vocabulary.json")
  .then(res => res.json())
  .then(data => {
    fullVocabulary = data;
    document.getElementById("currentWord").innerText = "Tayyor! Boshlash tugmasini bosing.";
  })
  .catch(() => {
    document.getElementById("currentWord").innerText = "❌ vocabulary.json topilmadi.";
  });
