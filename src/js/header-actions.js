/**
 * Header Menu Controller
 * Handles dropdown menu functionality and integrates with existing settings system
 */
(function() {
  'use strict';

  var HeaderMenuController = function() {
    this.currentOpenMenu = null;
    this.isTriggering = false; // Prevent infinite loops
    this.init();
  };

  HeaderMenuController.prototype.init = function() {
    this.bindMenuButtons();
    this.bindMenuItems();
    this.bindDocumentClick();
    this.bindKeyboardShortcuts();
  };

  HeaderMenuController.prototype.bindMenuButtons = function() {
    var self = this;
    
    var fileMenuBtn = document.getElementById('file-menu-btn');
    var editMenuBtn = document.getElementById('edit-menu-btn');
    
    if (fileMenuBtn) {
      fileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self.toggleMenu(this, document.getElementById('file-menu'));
      });
    }

    if (editMenuBtn) {
      editMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self.toggleMenu(this, document.getElementById('edit-menu'));
      });
    }
  };

  HeaderMenuController.prototype.bindMenuItems = function() {
    var self = this;
    var menuItems = document.querySelectorAll('.menu-item-option[data-setting]');
    
    menuItems.forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var setting = this.getAttribute('data-setting');
        self.triggerSettingsAction(setting);
        self.closeAllMenus();
      });
    });
  };

  HeaderMenuController.prototype.bindDocumentClick = function() {
    var self = this;
    document.addEventListener('click', function(e) {
      if (self.currentOpenMenu && !e.target.closest('.menu-item')) {
        self.closeAllMenus();
      }
    });
  };

  HeaderMenuController.prototype.bindKeyboardShortcuts = function() {
    document.addEventListener('keydown', function(e) {
      if (e.altKey) {
        switch(e.key.toLowerCase()) {
          case 'f':
            e.preventDefault();
            var fileBtn = document.getElementById('file-menu-btn');
            if (fileBtn) fileBtn.click();
            break;
          case 'e':
            e.preventDefault();  
            var editBtn = document.getElementById('edit-menu-btn');
            if (editBtn) editBtn.click();
            break;
        }
      }
    });
  };

  HeaderMenuController.prototype.toggleMenu = function(menuButton, menuDropdown) {
    if (!menuDropdown) return;
    
    var wasOpen = menuDropdown.classList.contains('show');
    
    this.closeAllMenus();
    
    if (!wasOpen) {
      menuDropdown.classList.add('show');
      menuButton.classList.add('active');
      this.currentOpenMenu = menuDropdown;
    }
  };

  HeaderMenuController.prototype.closeAllMenus = function() {
    var dropdowns = document.querySelectorAll('.menu-dropdown');
    var buttons = document.querySelectorAll('.menu-button');
    
    dropdowns.forEach(function(dropdown) {
      dropdown.classList.remove('show');
    });
    
    buttons.forEach(function(button) {
      button.classList.remove('active');
    });
    
    this.currentOpenMenu = null;
  };

  HeaderMenuController.prototype.triggerSettingsAction = function(setting) {
    // Prevent infinite loop
    if (this.isTriggering) {
      return;
    }
    
    this.isTriggering = true;
    
    try {
      console.log('Attempting to open setting:', setting);
      
      // Find the settings container
      var settingsContainer = document.querySelector('[data-pskl-controller=settings]');
      if (!settingsContainer) {
        console.warn('Settings container not found');
        return;
      }
      
      // Find the original hidden button
      var originalButton = settingsContainer.querySelector('[data-setting="' + setting + '"]');
      if (!originalButton) {
        console.warn('Original button not found for setting:', setting);
        return;
      }
      
      console.log('Found original button:', originalButton);
      
      // Temporarily remove our event listeners to prevent loops
      this.temporarilyDisableMenuListeners();
      
      // Create and dispatch a MouseEvent directly on the original button
      var clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      
      // Dispatch the event
      originalButton.dispatchEvent(clickEvent);
      
      // Check if drawer opened after a short delay
      setTimeout(() => {
        var drawerContainer = document.getElementById('drawer-container');
        var settingsSection = document.getElementById('application-action-section');
        
        console.log('Drawer container:', drawerContainer);
        console.log('Settings section classes:', settingsSection ? settingsSection.className : 'not found');
        console.log('Drawer content:', drawerContainer ? drawerContainer.innerHTML.length : 'no content');
        
        if (settingsSection && settingsSection.classList.contains('expanded')) {
          console.log('Settings drawer should be visible now');
        } else {
          console.log('Settings drawer did not expand properly');
        }
        
        this.reEnableMenuListeners();
      }, 100);
      
    } catch (error) {
      console.error('Error triggering settings action:', error);
    } finally {
      this.isTriggering = false;
    }
  };

  HeaderMenuController.prototype.temporarilyDisableMenuListeners = function() {
    // Store current listeners and remove them temporarily
    var menuItems = document.querySelectorAll('.menu-item-option[data-setting]');
    menuItems.forEach(function(item) {
      item.style.pointerEvents = 'none';
    });
  };

  HeaderMenuController.prototype.reEnableMenuListeners = function() {
    var menuItems = document.querySelectorAll('.menu-item-option[data-setting]');
    menuItems.forEach(function(item) {
      item.style.pointerEvents = 'auto';
    });
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      new HeaderMenuController();
    });
  } else {
    new HeaderMenuController();
  }

  // Expose globally if needed
  window.HeaderMenuController = HeaderMenuController;
})();