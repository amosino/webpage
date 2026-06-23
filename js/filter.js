document.addEventListener('DOMContentLoaded', () => {
  // --- Item Accordion Toggles (Abstract / Details) ---
  const initAccordions = () => {
    const listItems = document.querySelectorAll('.list-item');
    listItems.forEach(item => {
      const header = item.querySelector('.item-main');
      const details = item.querySelector('.item-details');
      
      if (header && details) {
        header.addEventListener('click', (e) => {
          // Prevent action if clicking on links or badges
          if (e.target.closest('a') || e.target.closest('.item-link')) {
            return;
          }
          
          const isOpen = item.classList.contains('open');
          
          // Toggle current item
          if (isOpen) {
            item.classList.remove('open');
            details.style.display = 'none';
          } else {
            item.classList.add('open');
            details.style.display = 'block';
          }
        });
      }
    });
  };

  // --- Filtering Logic ---
  const initFilterAndSort = () => {
    const filterSelect = document.getElementById('cd-dropdown');
    const sortBtnDesc = document.querySelector('.sort[data-order="desc"]');
    const sortBtnAsc = document.querySelector('.sort[data-order="asc"]');
    const container = document.querySelector('.pitems');
    
    if (!container) return;
    
    let items = Array.from(container.querySelectorAll('.list-item'));
    
    // 1. Filter function
    const applyFilter = (filterValue) => {
      items.forEach(item => {
        // Add fade-out for transition
        item.classList.add('fade-out');
        
        setTimeout(() => {
          if (filterValue === 'all' || item.classList.contains(filterValue)) {
            item.classList.remove('hidden');
            // Force reflow
            item.offsetHeight; 
            item.classList.remove('fade-out');
          } else {
            item.classList.add('hidden');
          }
        }, 150);
      });
    };

    // 2. Sort function
    const applySort = (order) => {
      // Re-query items to get current state
      items = Array.from(container.querySelectorAll('.list-item'));
      
      items.sort((a, b) => {
        const yearA = parseInt(a.getAttribute('data-year')) || 0;
        const yearB = parseInt(b.getAttribute('data-year')) || 0;
        
        if (order === 'desc') {
          return yearB - yearA;
        } else {
          return yearA - yearB;
        }
      });
      
      // Detach and re-append in new order
      items.forEach(item => {
        container.appendChild(item);
      });
    };

    // Event Listeners
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        applyFilter(e.target.value);
      });
    }

    if (sortBtnDesc && sortBtnAsc) {
      sortBtnDesc.addEventListener('click', () => {
        sortBtnDesc.classList.add('active');
        sortBtnAsc.classList.remove('active');
        applySort('desc');
      });

      sortBtnAsc.addEventListener('click', () => {
        sortBtnAsc.classList.add('active');
        sortBtnDesc.classList.remove('active');
        applySort('asc');
      });
    }
  };

  initAccordions();
  initFilterAndSort();
});
