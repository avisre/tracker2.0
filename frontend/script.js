const API_URL = 'https://tracker2-0.onrender.com/api';
let portfolioValueOverTime = []; // To track the portfolio value over time
let stockAllocation = {}; // To track stock allocation by symbol

//////////////////////////////////
// LOGIN FUNCTIONALITY
//////////////////////////////////
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message'); // Error message div

    // Clear previous error messages
    errorMessage.textContent = '';

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        // If login is successful, save token to localStorage and redirect to dashboard
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html'; // Redirect to the dashboard page
      } else {
        // Display error message if login failed
        errorMessage.textContent = data.message || 'Login failed, please try again.';
      }
    } catch (error) {
      console.error('Error logging in:', error);
      errorMessage.textContent = 'Something went wrong. Please try again later.';
    }
  });
}

//////////////////////////////////
// REGISTRATION FUNCTIONALITY
//////////////////////////////////
if (document.getElementById('register-form')) {
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message'); // Error message div

    // Clear previous error messages
    errorMessage.textContent = '';

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        // If registration is successful, save token to localStorage and redirect to dashboard
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html'; // Redirect to the dashboard page
      } else {
        // Display error message if registration failed
        errorMessage.textContent = data.message || 'Registration failed, please try again.';
      }
    } catch (error) {
      console.error('Error registering:', error);
      errorMessage.textContent = 'Something went wrong. Please try again later.';
    }
  });
}

//////////////////////////////////
// PORTFOLIO FUNCTIONALITY (Dashboard)
//////////////////////////////////

// Ensure user is logged in by checking the token
if (window.location.pathname === '/dashboard.html') {
  if (!localStorage.getItem('token')) {
    window.location.href = 'index.html'; // Redirect to login if not authenticated
  }

  // Fetch and display portfolio data when the dashboard is loaded
  async function fetchPortfolio() {
    try {
      const response = await fetch(`${API_URL}/portfolio`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const portfolio = await response.json();
      updatePortfolio(portfolio);
      updateLineChart();
      updateDoughnutChart();
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  }

  // Update the portfolio UI with the fetched data
  function updatePortfolio(portfolio) {
    const stocksListElement = document.getElementById('stocks-list');
    const totalValueElement = document.getElementById('total-value');
    const gainLossElement = document.getElementById('gain-loss');
    const percentageChangeElement = document.getElementById('percentage-change');

    // Clear the current list
    stocksListElement.innerHTML = '';

    let totalValue = 0;
    let totalGainLoss = 0;

    stockAllocation = {}; // Reset stock allocation
    portfolio.forEach((stock) => {
      const stockValue = stock.currentPrice * stock.shares;
      totalValue += stockValue;

      const increaseValue = (stock.currentPrice - stock.purchasePrice).toFixed(2);
      const increasePercentage = (((stock.currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100).toFixed(2);

      if (stock.symbol in stockAllocation) {
        stockAllocation[stock.symbol] += stockValue;
      } else {
        stockAllocation[stock.symbol] = stockValue;
      }

      const row = `<tr>
          <td>${stock.symbol}</td>
          <td>${stock.shares}</td>
          <td>${stock.purchasePrice}</td>
          <td>${stock.currentPrice}</td>
          <td>${increaseValue} (${increasePercentage}%)</td>
          <td><button class="delete-btn" onclick="deleteStock('${stock._id}')">Delete</button></td>
        </tr>`;
      stocksListElement.innerHTML += row;
    });

    portfolioValueOverTime.push(totalValue); // Track total value over time

    totalValueElement.textContent = totalValue.toFixed(2);
    gainLossElement.textContent = totalGainLoss.toFixed(2);
    percentageChangeElement.textContent = ((totalGainLoss / totalValue) * 100).toFixed(2);
  }

  // Add stock to the portfolio
  document.getElementById('add-stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const symbol = document.getElementById('stock-symbol').value.trim();
    const shares = document.getElementById('shares').value.trim();

    if (symbol && shares) {
      const stock = { symbol, shares: parseFloat(shares), purchaseDate: new Date().toISOString() };
      try {
        const response = await fetch(`${API_URL}/portfolio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(stock),
        });

        if (response.ok) {
          fetchPortfolio(); // Refresh portfolio after adding stock
        } else {
          alert('Error adding stock');
        }
      } catch (error) {
        console.error('Error adding stock:', error);
      }
    }
  });

  // Delete stock from the portfolio (ensure deleteStock is accessible globally)
  window.deleteStock = async function deleteStock(stockId) {
    try {
      const response = await fetch(`${API_URL}/portfolio/${stockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error deleting stock');
      }

      fetchPortfolio(); // Refresh portfolio after deletion
    } catch (error) {
      console.error('Error deleting stock:', error);
    }
  };

  // Line Chart for Portfolio Value Over Time
  let lineChart;
  function updateLineChart() {
    const ctx = document.getElementById('portfolio-line-chart').getContext('2d');

    if (lineChart) {
      lineChart.destroy(); // Destroy previous instance to avoid overlap
    }

    lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: portfolioValueOverTime.map((_, index) => `Day ${index + 1}`), // Dynamic labels
        datasets: [{
          label: 'Portfolio Value Over Time',
          data: portfolioValueOverTime,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
        }],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Time' } },
          y: { title: { display: true, text: 'Portfolio Value ($)' }, beginAtZero: true },
        },
      },
    });
  }

  // Doughnut Chart for Stock Allocation
  let doughnutChart;
  function updateDoughnutChart() {
    const ctx = document.getElementById('stock-allocation-doughnut').getContext('2d');

    if (doughnutChart) {
      doughnutChart.destroy(); // Destroy previous instance to avoid overlap
    }

    const stockSymbols = Object.keys(stockAllocation);
    const stockValues = Object.values(stockAllocation);
    const stockColors = stockSymbols.map((symbol) => getStockColor(symbol)); // Generate stock colors

    doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: stockSymbols,
        datasets: [{
          data: stockValues,
          backgroundColor: stockColors,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Stock Allocation' },
        },
      },
    });
  }

  // Function to get colors for stocks based on stock symbols
  function getStockColor(symbol) {
    const stockColors = {
      'AAPL': '#FF6384',
      'MSFT': '#36A2EB',
      'GOOGL': '#FFCE56',
      'TSLA': '#4BC0C0',
      'AMZN': '#9966FF',
      'AMD': '#FF9F40',
    };
    return stockColors[symbol] || '#C0C0C0'; // Default color if stock symbol not found
  }

  // Search functionality for stock symbols
  const companySearchInput = document.getElementById('stock-symbol');
  const searchResults = document.getElementById('search-results');

  companySearchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length > 2) {
      const results = await searchCompanies(query);
      showSearchResults(results);
    } else {
      searchResults.style.display = 'none';
    }
  });

  // Fetch company matches from the backend
  async function searchCompanies(query) {
    try {
      const response = await fetch(`${API_URL}/search/${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      return data.slice(0, 5); // Limit to 5 results
    } catch (error) {
      console.error('Error fetching company data:', error);
      return [];
    }
  }

  // Display search results
  function showSearchResults(results) {
    searchResults.innerHTML = '';
    results.forEach((result) => {
      const li = document.createElement('li');
      li.textContent = `${result.name} (${result.symbol})`;
      li.dataset.symbol = result.symbol;
      li.addEventListener('click', () => selectCompany(result.symbol));
      searchResults.appendChild(li);
    });
    searchResults.style.display = 'block';
  }

  // Handle company selection from search results
  function selectCompany(symbol) {
    companySearchInput.value = symbol;
    searchResults.style.display = 'none';
  }

  // Logout functionality
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token'); // Remove token from localStorage
    window.location.href = 'index.html'; // Redirect to login page
  });

  // Initial fetch of portfolio on page load
  fetchPortfolio();
}
