class MapGenerator {
  constructor(canvasHeight) {
    this.platforms = [];
    this.enemies = [];
    this.healthPotions = [];
    
    this.platformHeight = 20;
    this.minGap = 100;
    this.maxGap = 250;
    this.minWidth = 150;
    this.maxWidth = 400;
    
    let startY = canvasHeight * 0.75;
    this.minY = canvasHeight * 0.4;
    this.maxY = canvasHeight * 0.9;
    
    // Başlangıç platformu
    let startPlatform = {
      x: -100,
      y: startY,
      width: 800,
      height: this.platformHeight * 2,
      isScored: true
    };
    this.platforms.push(startPlatform);
    
    this.lastPlatformEndX = startPlatform.x + startPlatform.width;
    this.lastPlatformY = startPlatform.y;
  }
  
  update(cameraX, viewportWidth) {
    // Yeni platformlar oluştur
    while (this.lastPlatformEndX < cameraX + viewportWidth * 1.5) {
      let gap = Math.random() * (this.maxGap - this.minGap) + this.minGap;
      let width = Math.random() * (this.maxWidth - this.minWidth) + this.minWidth;
      let changeY = (Math.random() * 170) - 50;
      let newY = this.lastPlatformY + changeY;
      newY = Math.max(this.minY, Math.min(this.maxY, newY));
      let newX = this.lastPlatformEndX + gap;
      
      let newPlatform = {
        x: newX,
        y: newY,
        width: width,
        height: this.platformHeight,
        isScored: false
      };
      this.platforms.push(newPlatform);
      
      // Düşman oluştur (%40 şans)
      if (newX > 0 && Math.random() < 0.4) {
        let enemyHeight = 25;
        let enemyWidth = 25;
        this.enemies.push({
          x: newX + (width / 2) - (enemyWidth / 2),
          y: newY - enemyHeight,
          width: enemyWidth,
          height: enemyHeight,
          vx: 1.5,
          moveMinX: newX,
          moveMaxX: newX + width - enemyWidth,
          isAlive: true,
          color: '#B22222'
        });
      }
      
      // Can iksiri oluştur (%20 şans)
      if (newX > 0 && Math.random() < 0.2) {
        let potionSize = 20;
        this.healthPotions.push({
          x: newX + (width / 2) - (potionSize / 2),
          y: newY - potionSize - 5,
          width: potionSize,
          height: potionSize,
          color: '#FF69B4'
        });
      }
      
      this.lastPlatformEndX = newX + width;
      this.lastPlatformY = newY;
    }
    
    // Görünmeyen platformları temizle
    this.platforms = this.platforms.filter(platform =>
      platform.x + platform.width > cameraX
    );
    
    this.enemies = this.enemies.filter(enemy =>
      enemy.isAlive && (enemy.x + enemy.width > cameraX)
    );
    
    this.healthPotions = this.healthPotions.filter(potion =>
      potion.x + potion.width > cameraX
    );
  }
  
  draw(ctx) {
    ctx.fillStyle = '#654321';
    for (const platform of this.platforms) {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }
  }
  
  drawEnemies(ctx) {
    for (const enemy of this.enemies) {
      if (enemy.isAlive) {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    }
  }
  
  drawHealthPotions(ctx) {
    for (const potion of this.healthPotions) {
      ctx.fillStyle = potion.color;
      ctx.fillRect(potion.x, potion.y, potion.width, potion.height);
      
      // Artı işareti
      ctx.fillStyle = 'white';
      ctx.fillRect(potion.x + potion.width / 2 - 2, potion.y + 5, 4, potion.height - 10);
      ctx.fillRect(potion.x + 5, potion.y + potion.height / 2 - 2, potion.width - 10, 4);
    }
  }
  
  getPlatforms() {
    return this.platforms;
  }
  
  getEnemies() {
    return this.enemies;
  }
  
  getHealthPotions() {
    return this.healthPotions;
  }
}
