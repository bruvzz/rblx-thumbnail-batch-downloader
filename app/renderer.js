const { ipcRenderer } = require('electron');

document.getElementById('closeBtn').addEventListener('click', () => {
  ipcRenderer.send('window-control', 'close');
});
document.getElementById('minBtn').addEventListener('click', () => {
  ipcRenderer.send('window-control', 'minimize');
});
document.getElementById('maxBtn').addEventListener('click', () => {
  ipcRenderer.send('window-control', 'maximize');
});

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('active');
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle');
    const menu = dropdown.querySelector('.dropdown-menu');
    
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      
      document.querySelectorAll('.custom-dropdown').forEach(d => {
        if (d !== dropdown) {
          d.classList.remove('active');
          d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        }
      });
      
      dropdown.classList.toggle('active');
      toggle.setAttribute('aria-expanded', dropdown.classList.contains('active'));
    });
    
    menu.querySelectorAll('li').forEach(item => {
      item.addEventListener('click', () => {
        menu.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
        
        item.classList.add('selected');
        
        dropdown.querySelector('.selected-value').textContent = item.textContent;
        
        dropdown.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
      dropdown.classList.remove('active');
      dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
    });
  });

  window.getSelectedValues = function() {
    return {
      size: document.querySelector('#sizeDropdown .selected-value').textContent,
      format: document.querySelector('#formatDropdown .selected-value').textContent
    };
  };

});
