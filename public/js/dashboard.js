// Dashboard JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('BuggyBank Dashboard loaded');
    
    // Add some interactive functionality
    const balanceCard = document.querySelector('.balance-card');
    if (balanceCard) {
        balanceCard.addEventListener('click', function() {
            console.log('Balance card clicked');
        });
    }
    
    // Add hover effects to transaction rows
    const transactionRows = document.querySelectorAll('.data-table tbody tr');
    transactionRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f0f8ff';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}); 