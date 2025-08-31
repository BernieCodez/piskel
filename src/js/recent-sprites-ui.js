// Handles displaying and updating the recent sprites list in the UI
// Usage: Call RecentSpritesUI.init() after DOM is ready

class RecentSpritesUI {
  static spriteListId = 'recent-sprites';

  static init() {
    this.listElement = document.getElementById(this.spriteListId);
    if (!this.listElement) return;
    this.render();
  }

  static getRecentSprites() {
    // TODO: Replace with actual recent sprites logic
    // Example: return [{name: 'Sprite 1'}, {name: 'Sprite 2'}];
    return JSON.parse(localStorage.getItem('recentSprites') || '[]');
  }

  static setRecentSprites(sprites) {
    localStorage.setItem('recentSprites', JSON.stringify(sprites));
    this.render();
  }

  static render() {
    const sprites = this.getRecentSprites();
    this.listElement.innerHTML = '';
    sprites.forEach(sprite => {
      const li = document.createElement('li');
      li.textContent = sprite.name;
      li.onclick = () => this.onSpriteClick(sprite);
      this.listElement.appendChild(li);
    });
  }

  static onSpriteClick(sprite) {
    // TODO: Implement sprite switching logic
    alert('Switch to sprite: ' + sprite.name);
  }
}

// To initialize: RecentSpritesUI.init();
