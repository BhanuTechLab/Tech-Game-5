// Oyun yüklendiğinde başlat
window.onload = function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  const controlsDiv = document.querySelector('.controls');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const jumpBtn = document.getElementById('jumpBtn');
  
  // Canvas boyutunu ayarla
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Oyun sabitleri
  const GRAVITY = 0.6;
  const MOVE_SPEED = 5;
  const JUMP_FORCE = -14;
  
  // Oyun Durumları
  let gameState = 'playing';
  let score = 0;
  
  // Oyuncu objesi
  let player = {
    x: 100,
    y: 100,
    width: 30,
    height: 50,
    vx: 0,
    vy: 0,
    onGround: false,
    color: '#FF5733',
    maxHp: 3,
    hp: 3,
    isInvincible: false,
    invincibleTimer: 0,
    canDoubleJump: false,
    doubleJumpUsed: false,
    doubleJumpTimer: 0,
    doubleJumpCooldown: 180
  };
  
  // Kamera objesi
  let camera = {
    x: 0,
    y: 0
  };
  
  // Harita oluşturucu - hata kontrolü eklendi
  let mapGenerator;
  try {
    mapGenerator = new MapGenerator(canvas.height);
  } catch (error) {
    console.error("MapGenerator oluşturulurken hata:", error);
    // Basit bir fallback
    mapGenerator = {
      platforms: [],
      enemies: [],
      healthPotions: [],
      update: function() {},
      draw: function() {},
      drawEnemies: function() {},
      drawHealthPotions: function() {},
      getPlatforms: function() { return []; },
      getEnemies: function() { return []; },
      getHealthPotions: function() { return []; }
    };
  }
  
  // Giriş kontrolleri
  let input = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false
  };
  
  // Kontrol Fonksiyonları
  function showControls(visible) {
    if (controlsDiv) {
      controlsDiv.style.display = visible ? 'block' : 'none';
    }
  }
  
  function handleMenuInput(e) {
    if (gameState === 'gameOver') {
      e.preventDefault();
      resetGame();
      gameState = 'playing';
      showControls(true);
    }
  }
  
  // Event listener'lar
  if (window) {
    window.addEventListener('click', handleMenuInput);
    window.addEventListener('touchstart', handleMenuInput, { passive: false });
  }
  
  // Mobil kontrol butonları - hata kontrolü eklendi
  if (leftBtn) {
    leftBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (gameState === 'playing') input.left = true;
    });
    leftBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      input.left = false;
    });
  }
  
  if (rightBtn) {
    rightBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (gameState === 'playing') input.right = true;
    });
    rightBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      input.right = false;
    });
  }
  
  if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (gameState === 'playing') {
        input.jump = true;
        input.jumpPressed = true;
      }
    });
    jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      input.jump = false;
    });
  }
  
  // Klavye kontrolleri
  if (window) {
    window.addEventListener('keydown', (e) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft') input.left = true;
      if (e.key === 'ArrowRight') input.right = true;
      if (e.key === ' ' || e.key === 'w' || e.key === 'W') {
        input.jump = true;
        input.jumpPressed = true;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') input.left = false;
      if (e.key === 'ArrowRight') input.right = false;
      if (e.key === ' ' || e.key === 'w' || e.key === 'W') input.jump = false;
    });
  }
  
  // Ana oyun döngüsü
  function gameLoop() {
    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (gameState === 'playing') {
        update();
        drawGame();
      } else if (gameState === 'gameOver') {
        drawGameOverScreen();
      }
      
      requestAnimationFrame(gameLoop);
    } catch (error) {
      console.error("Oyun döngüsünde hata:", error);
    }
  }
  
  // Güncelleme fonksiyonları
  function update() {
    handleInput();
    applyPhysics();
    handlePlatformCollisions();
    
    updateEnemies();
    handleEnemyCollisions();
    
    updateHealthPotions();
    updateCamera();
    checkPlayerState();
    
    if (player.doubleJumpTimer > 0) {
      player.doubleJumpTimer--;
    }
    
    if (player.isInvincible) {
      player.invincibleTimer--;
      if (player.invincibleTimer <= 0) {
        player.isInvincible = false;
      }
    }
    
    if (mapGenerator && mapGenerator.update) {
      mapGenerator.update(camera.x, canvas.width);
    }
  }
  
  function handleInput() {
    if (input.left) player.vx = -MOVE_SPEED;
    else if (input.right) player.vx = MOVE_SPEED;
    else player.vx = 0;
    
    if (input.jumpPressed) {
      if (player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
        player.canDoubleJump = true;
        player.doubleJumpUsed = false;
      } else if (player.canDoubleJump && !player.doubleJumpUsed && player.doubleJumpTimer <= 0) {
        player.vy = JUMP_FORCE * 0.8;
        player.doubleJumpUsed = true;
        player.doubleJumpTimer = player.doubleJumpCooldown;
      }
      input.jumpPressed = false;
    }
  }
  
  function applyPhysics() {
    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;
  }
  
  function handlePlatformCollisions() {
    player.onGround = false;
    let platforms = [];
    
    try {
      platforms = mapGenerator.getPlatforms();
    } catch (error) {
      console.error("Platformlar alınırken hata:", error);
      platforms = [];
    }
    
    for (const p of platforms) {
      if (player.x < p.x + p.width &&
        player.x + player.width > p.x &&
        player.y + player.height > p.y &&
        player.y + player.height < p.y + p.height + player.vy)
      {
        if (player.vy > 0) {
          player.y = p.y - player.height;
          player.vy = 0;
          player.onGround = true;
          player.canDoubleJump = true;
          player.doubleJumpUsed = false;
          
          if (p.isScored === false) {
            score += 10;
            p.isScored = true;
          }
        }
      }
    }
  }
  
  function updateEnemies() {
    let enemies = [];
    
    try {
      enemies = mapGenerator.getEnemies();
    } catch (error) {
      console.error("Düşmanlar alınırken hata:", error);
      enemies = [];
    }
    
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      
      enemy.x += enemy.vx;
      
      if (enemy.x <= enemy.moveMinX || enemy.x >= enemy.moveMaxX) {
        enemy.vx *= -1;
      }
    }
  }
  
  function handleEnemyCollisions() {
    if (player.isInvincible) return;
    
    let enemies = [];
    
    try {
      enemies = mapGenerator.getEnemies().filter(e => e.isAlive);
    } catch (error) {
      console.error("Düşman çarpışması kontrol edilirken hata:", error);
      enemies = [];
    }
    
    for (const enemy of enemies) {
      if (player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y)
      {
        let isStomp = player.vy > 0 &&
          (player.y + player.height) < (enemy.y + (enemy.height / 2));
        
        if (isStomp) {
          enemy.isAlive = false;
          player.vy = JUMP_FORCE / 1.5;
          score += 50;
        } else {
          takeDamage(1);
        }
      }
    }
  }
  
  function updateHealthPotions() {
    let potions = [];
    
    try {
      potions = mapGenerator.getHealthPotions();
    } catch (error) {
      console.error("Can iksirleri alınırken hata:", error);
      potions = [];
    }
    
    for (let i = 0; i < potions.length; i++) {
      const potion = potions[i];
      
      if (player.x < potion.x + potion.width &&
        player.x + player.width > potion.x &&
        player.y < potion.y + potion.height &&
        player.y + player.height > potion.y)
      {
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          potions.splice(i, 1);
          i--;
          score += 25;
        }
      }
    }
  }
  
  function takeDamage(amount) {
    if (player.isInvincible) return;
    
    player.hp -= amount;
    player.isInvincible = true;
    player.invincibleTimer = 90;
  }
  
  function updateCamera() {
    let targetCameraX = player.x - canvas.width / 3;
    if (targetCameraX > camera.x) {
      camera.x = targetCameraX;
    }
  }
  
  function checkPlayerState() {
    if (player.y > canvas.height) {
      player.hp = 0;
      gameState = 'gameOver';
      showControls(false);
    }
    
    if (player.hp <= 0 && gameState === 'playing') {
      gameState = 'gameOver';
      showControls(false);
    }
  }
  
  function resetGame() {
    player.x = 100;
    player.y = 100;
    player.vx = 0;
    player.vy = 0;
    player.hp = player.maxHp;
    player.isInvincible = false;
    player.canDoubleJump = false;
    player.doubleJumpUsed = false;
    player.doubleJumpTimer = 0;
    
    camera.x = 0;
    score = 0;
    
    try {
      mapGenerator = new MapGenerator(canvas.height);
    } catch (error) {
      console.error("MapGenerator resetlenirken hata:", error);
    }
  }
  
  // Çizim fonksiyonları
  function drawGame() {
    // Arka plan
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Harita bileşenlerini çiz
    try {
      if (mapGenerator.draw) mapGenerator.draw(ctx);
      if (mapGenerator.drawEnemies) mapGenerator.drawEnemies(ctx);
      if (mapGenerator.drawHealthPotions) mapGenerator.drawHealthPotions(ctx);
    } catch (error) {
      console.error("Harita çizilirken hata:", error);
    }
    
    // Oyuncuyu çiz
    if (!player.isInvincible || Math.floor(player.invincibleTimer / 6) % 2 === 0) {
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }
    
    ctx.restore();
    
    // UI elementleri
    drawUI();
  }
  
  function drawUI() {
    // Skor
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Skor: ' + score, 20, 40);
    
    // Can barı
    drawHealthBar();
    
    // Double jump cooldown
    drawDoubleJumpCooldown();
  }
  
  function drawHealthBar() {
    let barWidth = 150;
    let barHeight = 25;
    let barX = canvas.width - barWidth - 20;
    let barY = 20;
    
    ctx.fillStyle = '#555';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    let hpPercent = player.hp / player.maxHp;
    ctx.fillStyle = hpPercent < 0.3 ? '#DD2222' : '#22DD22';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
  
  function drawDoubleJumpCooldown() {
    let cooldownWidth = 150;
    let cooldownHeight = 15;
    let cooldownX = canvas.width - cooldownWidth - 20;
    let cooldownY = 60;
    
    ctx.fillStyle = '#555';
    ctx.fillRect(cooldownX, cooldownY, cooldownWidth, cooldownHeight);
    
    let cooldownPercent = 1 - (player.doubleJumpTimer / player.doubleJumpCooldown);
    ctx.fillStyle = '#2288FF';
    ctx.fillRect(cooldownX, cooldownY, cooldownWidth * cooldownPercent, cooldownHeight);
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.strokeRect(cooldownX, cooldownY, cooldownWidth, cooldownHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Double Jump', cooldownX + cooldownWidth / 2, cooldownY - 5);
    
    if (player.doubleJumpTimer > 0) {
      let seconds = (player.doubleJumpTimer / 60).toFixed(1);
      ctx.fillText(seconds + 's', cooldownX + cooldownWidth / 2, cooldownY + cooldownHeight + 12);
    }
  }
  
  function drawGameOverScreen() {
    ctx.fillStyle = '#330000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 3);
    
    ctx.font = '30px Arial';
    ctx.fillText('Skor: ' + score, canvas.width / 2, canvas.height / 2);
    
    ctx.font = '24px Arial';
    ctx.fillText('Tap to restart the game', canvas.width / 2, canvas.height * 0.7);
  }
  
  // Ekran yeniden boyutlandırma
  if (window) {
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      resetGame();
      gameState = 'playing';
      showControls(true);
    });
  }
  
  // Oyunu başlat
  showControls(true);
  gameLoop();
};
