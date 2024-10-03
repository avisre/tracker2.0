const API_URL = 'https://stockportfolio.pro/api';
let portfolioValueOverTime = []; // To track the portfolio value over time
let stockAllocationOverTime = []; // To track stock allocation over time
let stockSymbols = []; // To keep track of stock symbols

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
if (window.location.pathname.endsWith('dashboard.html')) {
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
      drawStackedAreaChart();
      drawInteractiveLineChart();
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
    let totalPurchaseValue = 0;

    stockAllocationOverTime = []; // Reset stock allocation over time
    stockSymbols = []; // Reset stock symbols

    portfolio.forEach((stock) => {
      const stockValue = stock.currentPrice * stock.shares;
      const purchaseValue = stock.purchasePrice * stock.shares;
      totalValue += stockValue;
      totalPurchaseValue += purchaseValue;

      const increaseValue = (stock.currentPrice - stock.purchasePrice) * stock.shares;
      const increasePercentage = ((stock.currentPrice - stock.purchasePrice) / stock.purchasePrice * 100).toFixed(2);

      // Collect data for the stacked area chart
      if (!stockSymbols.includes(stock.symbol)) {
        stockSymbols.push(stock.symbol);
      }

      // For demo purposes, generate random data over 10 days
      const stockData = [];
      for (let day = 1; day <= 10; day++) {
        stockData.push({
          day: day,
          value: stock.currentPrice * stock.shares * (1 + (Math.random() - 0.5) / 10), // Random fluctuation
        });
      }
      stockAllocationOverTime.push({
        symbol: stock.symbol,
        data: stockData,
      });

      const row = `<tr>
          <td>${stock.symbol}</td>
          <td>${stock.shares}</td>
          <td>${stock.purchasePrice.toFixed(2)}</td>
          <td>${stock.currentPrice.toFixed(2)}</td>
          <td>${increaseValue.toFixed(2)} (${increasePercentage}%)</td>
          <td><button class="delete-btn" onclick="deleteStock('${stock._id}')">Delete</button></td>
        </tr>`;
      stocksListElement.innerHTML += row;
    });

    // For the interactive line chart, track total portfolio value over time
    portfolioValueOverTime = [];
    for (let day = 1; day <= 10; day++) {
      let dayValue = 0;
      stockAllocationOverTime.forEach(stock => {
        const stockDayData = stock.data.find(d => d.day === day);
        dayValue += stockDayData ? stockDayData.value : 0;
      });
      portfolioValueOverTime.push({
        day: day,
        value: dayValue,
      });
    }

    const totalGainLoss = totalValue - totalPurchaseValue;
    const percentageChange = (totalGainLoss / totalPurchaseValue * 100).toFixed(2);

    totalValueElement.textContent = totalValue.toFixed(2);
    gainLossElement.textContent = totalGainLoss.toFixed(2);
    percentageChangeElement.textContent = percentageChange;
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

  // Delete stock from the portfolio
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

  // D3.js Stacked Area Chart for Portfolio Growth Over Time
  function drawStackedAreaChart() {
    // Prepare data
    const stackData = [];
    const days = [...Array(10).keys()].map(i => i + 1); // Days 1 to 10
    days.forEach(day => {
      const dayData = { day: day };
      stockAllocationOverTime.forEach(stock => {
        const stockDayData = stock.data.find(d => d.day === day);
        dayData[stock.symbol] = stockDayData ? stockDayData.value : 0;
      });
      stackData.push(dayData);
    });

    // Set up dimensions and margins
    const margin = { top: 20, right: 30, bottom: 50, left: 60 },
      width = 600 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    // Remove any existing SVG
    d3.select('#portfolio-area-chart').selectAll('*').remove();

    // Create SVG container
    const svg = d3
      .select('#portfolio-area-chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .style('max-width', '100%')
      .style('height', 'auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up X and Y scales
    const xScale = d3.scaleLinear()
      .domain([1, 10])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(stackData, d => {
        let total = 0;
        stockSymbols.forEach(symbol => total += d[symbol]);
        return total;
      })])
      .range([height, 0]);

    // Set up color scale
    const color = d3.scaleOrdinal()
      .domain(stockSymbols)
      .range(d3.schemeTableau10);

    // Stack the data
    const stack = d3.stack()
      .keys(stockSymbols);

    const stackedData = stack(stackData);

    // Create the area generator
    const area = d3.area()
      .x(d => xScale(d.data.day))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveMonotoneX);

    // Add the stacked areas
    svg.selectAll('.area')
      .data(stackedData)
      .enter()
      .append('path')
      .attr('class', 'area')
      .attr('d', area)
      .style('fill', d => color(d.key))
      .style('opacity', 0.8);

    // Add X Axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .append('text')
      .attr('y', 35)
      .attr('x', width / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .text('Time');

    // Add Y Axis
    svg.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .text('Portfolio Value ($)');

    // Add legend
    const legend = svg.selectAll('.legend')
      .data(stockSymbols)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', (d, i) => `translate(0,${i * 20})`);

    legend.append('rect')
      .attr('x', width - 18)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', color);

    legend.append('text')
      .attr('x', width - 24)
      .attr('y', 9)
      .attr('dy', '.35em')
      .style('text-anchor', 'end')
      .text(d => d);
  }

  // D3.js Interactive Line Chart for Portfolio Value Over Time
  function drawInteractiveLineChart() {
    const data = portfolioValueOverTime;

    // Set up dimensions and margins
    const margin = { top: 20, right: 30, bottom: 50, left: 60 },
      width = 600 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    // Remove any existing SVG
    d3.select('#portfolio-line-chart').selectAll('*').remove();

    // Create SVG container
    const svg = d3
      .select('#portfolio-line-chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .style('max-width', '100%')
      .style('height', 'auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.day))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .nice()
      .range([height, 0]);

    // Define the line
    const line = d3.line()
      .x(d => xScale(d.day))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add the line path
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4e79a7')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add X Axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .append('text')
      .attr('y', 35)
      .attr('x', width / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .text('Time');

    // Add Y Axis
    svg.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .text('Portfolio Value ($)');

    // Add tooltip
    const tooltip = d3.select('#portfolio-line-chart')
      .append('div')
      .style('opacity', 0)
      .attr('class', 'tooltip');

    // Add dots for each data point
    svg.selectAll('dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.day))
      .attr('cy', d => yScale(d.value))
      .attr('r', 5)
      .attr('fill', '#4e79a7')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 7);
        tooltip
          .style('opacity', 1)
          .html(`<strong>Day ${d.day}</strong><br>Value: $${d.value.toFixed(2)}`)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 5);
        tooltip.style('opacity', 0);
      });
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
