document.addEventListener('DOMContentLoaded', () => {
  // Mobile navigation hamburger toggle
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const navList = document.querySelector('.nav-list');

  if (mobileToggle && navList) {
    mobileToggle.addEventListener('click', () => {
      navList.classList.toggle('open');
      
      // Change icon
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        if (navList.classList.contains('open')) {
          icon.className = 'bi bi-x-lg';
        } else {
          icon.className = 'bi bi-list';
        }
      }
    });

    // Close menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navList.classList.remove('open');
        const icon = mobileToggle.querySelector('i');
        if (icon) {
          icon.className = 'bi bi-list';
        }
      });
    });
  }

  // Active link highlight
  const path = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    try {
      const linkUrl = new URL(link.getAttribute('href'), window.location.origin + window.location.pathname).pathname;
      
      let isActive = false;
      if (path === linkUrl || path === linkUrl + 'index.html' || (path === '/' && linkUrl.endsWith('/index.html'))) {
        isActive = true;
      } else if (path.includes('/blog/') && linkUrl.includes('/blog/')) {
        isActive = true;
      } else if (path.includes('/docencia/') && linkUrl.endsWith('/docencia.html')) {
        isActive = true;
      }
      
      if (isActive) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    } catch (e) {
      console.error('Error resolving link URL', e);
    }
  });

  // Dynamic current year in footer
  const currentYearSpan = document.getElementById('current-year');
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  // ==========================================================================
  // Lógica del Reproductor de Narración por Voz
  // ==========================================================================
  const player = document.getElementById('narration-player');
  if (player) {
    const audioSrc = player.dataset.audio;
    const playBtn = document.getElementById('play-narration-btn');
    const statusSpan = document.getElementById('audio-status');
    const speedBtn = document.getElementById('speed-btn');

    if (audioSrc) {
      // --------------------------------------------------
      // OPCIÓN A: Reproducción de archivo de audio grabado
      // --------------------------------------------------
      player.style.display = 'flex';
      
      let audio = new Audio(audioSrc);
      let isPlaying = false;
      let speedIndex = 0;
      const speeds = [1.0, 1.25, 1.5];
      
      audio.onplay = () => {
        isPlaying = true;
        player.classList.add('playing');
        playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        statusSpan.textContent = 'Reproduciendo audio...';
      };
      
      audio.onpause = () => {
        isPlaying = false;
        player.classList.remove('playing');
        playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        statusSpan.textContent = 'Audio pausado';
      };
      
      audio.onended = () => {
        isPlaying = false;
        player.classList.remove('playing');
        playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        statusSpan.textContent = 'Escuchar este artículo';
        audio.playbackRate = 1.0;
        speedBtn.textContent = '1.0x';
        speedIndex = 0;
      };
      
      playBtn.addEventListener('click', () => {
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(err => {
            console.error("Error al reproducir audio:", err);
            statusSpan.textContent = 'Error al cargar audio';
          });
        }
      });
      
      speedBtn.addEventListener('click', () => {
        speedIndex = (speedIndex + 1) % speeds.length;
        const rate = speeds[speedIndex];
        audio.playbackRate = rate;
        speedBtn.textContent = rate.toFixed(2) + 'x';
      });
      
      window.addEventListener('beforeunload', () => {
        audio.pause();
      });
      
    } else if ('speechSynthesis' in window) {
      // --------------------------------------------------
      // OPCIÓN B: Síntesis de voz (Text-to-Speech)
      // --------------------------------------------------
      player.style.display = 'flex';
      
      let isPlaying = false;
      let isPaused = false;
      let speechRate = 1.0;
      let speechUtterance = null;
      let textToRead = '';
      
      // 1. Colocar el widget dinámicamente debajo de "Versión extendida..." si existe
      const postBody = document.querySelector('.post-body');
      if (postBody) {
        const firstParagraph = postBody.querySelector('p');
        if (firstParagraph && firstParagraph.textContent.includes('Versión extendida')) {
          firstParagraph.after(player);
        }
      }
      
      // 2. Extraer texto limpio del artículo para la lectura
      function getArticleText() {
        if (!postBody) return '';
        
        let textParts = [];
        let skipText = false;
        
        Array.from(postBody.children).forEach((el, index) => {
          // Omitir el reproductor en sí
          if (el === player || el.id === 'narration-player' || el.classList.contains('audio-narration-player')) {
            return;
          }
          // Omitir el primer párrafo si es la nota de "Versión extendida"
          if (index === 0 && el.tagName === 'P' && el.textContent.includes('Versión extendida')) {
            return;
          }
          // Detener la lectura si llegamos a lecturas recomendadas, firma del autor, etc.
          if (el.id === 'lecturas-recomendadas' || el.textContent.toLowerCase().includes('lecturas recomendadas')) {
            skipText = true;
          }
          if (el.textContent.includes('Alejandro Mosiño')) {
            skipText = true;
          }
          if (el.classList.contains('post-updated')) {
            skipText = true;
          }
          
          if (!skipText) {
            if (['P', 'H2', 'H3', 'LI'].includes(el.tagName)) {
              let text = el.textContent.trim();
              // Agregar puntuación para pausa natural en los títulos
              if (['H2', 'H3'].includes(el.tagName)) {
                text += '.';
              }
              textParts.push(text);
            }
          }
        });
        
        return textParts.join(' ');
      }
      
      // 3. Controlar la reproducción de la voz
      function startSpeaking() {
        window.speechSynthesis.cancel(); // Detener cualquier reproducción previa
        
        if (!textToRead) {
          textToRead = getArticleText();
        }
        
        if (!textToRead) {
          statusSpan.textContent = 'No hay texto para leer';
          return;
        }
        
        speechUtterance = new SpeechSynthesisUtterance(textToRead);
        speechUtterance.rate = speechRate;
        speechUtterance.lang = 'es-MX';
        
        // Cargar voces en español
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang.startsWith('es-MX')) || 
                             voices.find(voice => voice.lang.startsWith('es'));
        if (spanishVoice) {
          speechUtterance.voice = spanishVoice;
        }
        
        speechUtterance.onend = () => {
          resetPlayerState();
        };
        
        speechUtterance.onerror = (e) => {
          console.error('SpeechSynthesis error:', e);
          resetPlayerState();
        };
        
        window.speechSynthesis.speak(speechUtterance);
        isPlaying = true;
        isPaused = false;
        updatePlayerUI();
      }
      
      function updatePlayerUI() {
        if (isPlaying && !isPaused) {
          player.classList.add('playing');
          playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
          statusSpan.textContent = 'Reproduciendo artículo...';
        } else if (isPaused) {
          player.classList.remove('playing');
          playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
          statusSpan.textContent = 'Narración pausada';
        } else {
          player.classList.remove('playing');
          playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
          statusSpan.textContent = 'Escuchar este artículo';
        }
      }
      
      function resetPlayerState() {
        isPlaying = false;
        isPaused = false;
        updatePlayerUI();
      }
      
      // 4. Listeners de eventos
      playBtn.addEventListener('click', () => {
        if (!isPlaying) {
          startSpeaking();
        } else if (isPaused) {
          window.speechSynthesis.resume();
          isPaused = false;
          updatePlayerUI();
        } else {
          window.speechSynthesis.pause();
          isPaused = true;
          updatePlayerUI();
        }
      });
      
      const rates = [1.0, 1.25, 1.5];
      let currentRateIndex = 0;
      speedBtn.addEventListener('click', () => {
        currentRateIndex = (currentRateIndex + 1) % rates.length;
        speechRate = rates[currentRateIndex];
        speedBtn.textContent = speechRate.toFixed(2) + 'x';
        
        if (isPlaying) {
          const wasPaused = isPaused;
          window.speechSynthesis.cancel();
          if (!wasPaused) {
            startSpeaking();
          } else {
            resetPlayerState();
          }
        }
      });
      
      // Cancelar reproducción si se sale de la página
      window.addEventListener('beforeunload', () => {
        window.speechSynthesis.cancel();
      });
      
      // Safari carga las voces asíncronamente, esto asegura soporte
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          // Re-asociar voz si cambia/se carga tarde
          if (speechUtterance && !isPlaying) {
            const voices = window.speechSynthesis.getVoices();
            const spanishVoice = voices.find(voice => voice.lang.startsWith('es-MX')) || 
                                 voices.find(voice => voice.lang.startsWith('es'));
            if (spanishVoice) speechUtterance.voice = spanishVoice;
          }
        };
      }
    }
  }
});
