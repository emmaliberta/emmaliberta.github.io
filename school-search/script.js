document.addEventListener('DOMContentLoaded', () => {
    const csvUrl = 'district_data.csv';
    let districtData = [];
    let chartInstance = null;

    // DOM Elements
    const searchInput = document.getElementById('districtSearch');
    const suggestionsBox = document.getElementById('suggestions');
    const resultContainer = document.getElementById('resultContainer');
    const districtNameHeading = document.getElementById('districtName');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const ctx = document.getElementById('absenteeChart').getContext('2d');

    // Initialize
    init();

    function init() {
        showLoading(true);
        Papa.parse(csvUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                showLoading(false);
                districtData = results.data;
                console.log('Data loaded:', districtData.length, 'records');
            },
            error: (err) => {
                showLoading(false);
                showError('Failed to load data. Please try again later.');
                console.error('Papa Parse Error:', err);
            }
        });

        // Event Listeners
        searchInput.addEventListener('input', handleSearchInput);

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                suggestionsBox.classList.add('hidden');
            }
        });
    }

    function handleSearchInput(e) {
        const query = e.target.value.toLowerCase().trim();
        suggestionsBox.innerHTML = '';

        if (query.length < 2) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        const matches = districtData.filter(d =>
            d.clean_name && d.clean_name.toLowerCase().includes(query)
        ).slice(0, 10); // Limit to 10 suggestions

        if (matches.length > 0) {
            suggestionsBox.classList.remove('hidden');
            matches.forEach(match => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = match.clean_name;
                div.addEventListener('click', () => selectDistrict(match));
                suggestionsBox.appendChild(div);
            });
        } else {
            suggestionsBox.classList.add('hidden');
        }
    }

    function selectDistrict(district) {
        // Update Search Input
        searchInput.value = district.clean_name;
        suggestionsBox.classList.add('hidden');

        // Show Results
        resultContainer.classList.remove('hidden');
        districtNameHeading.textContent = district.clean_name;

        // Process Data for Chart
        const years = Object.keys(district)
            .filter(key => key !== 'clean_name')
            .sort() // Sort years to be chronological (2019... -> 2024...)
            .reverse(); // Actually, the keys are "20242025" etc. Sorting them string-wise works for numbers "20192020" < "20242025".
        // Wait, if I sort normally: 20192020, 20202021... 20242025. That is chronological.
        // I want chart left-to-right (old -> new). So simple sort is fine.

        // Wait, "20242025" is how it is in CSV.
        // Let's verify sort order.
        // "20192020", "20202021" ... correct. ascending.

        const labels = years.map(formatYearLabel);
        const dataPoints = years.map(year => {
            const val = district[year];
            return (val === 'NA' || val === '' || val === undefined) ? null : parseFloat(val);
        });

        renderChart(labels, dataPoints);
        renderTable(labels, dataPoints);
    }

    function renderTable(labels, data) {
        let html = '<table class="data-table"><thead><tr><th>School Year</th><th>Chronic Absenteeism</th></tr></thead><tbody>';

        // Reverse arrays to show newest first for the table (table usually reads better top-to-bottom as new-to-old or old-to-new, but let's match chart left-to-right order which is old-to-new? 
        // Actually, usually users want to see the latest year first in a table.
        // My labels/data are sorted 2019 -> 2024 (ascending).
        // Let's reverse them for the table so 2024 is at the top.

        const reversedLabels = [...labels].reverse();
        const reversedData = [...data].reverse();

        reversedLabels.forEach((label, index) => {
            const val = reversedData[index];
            const displayVal = val !== null ? `${val}%` : 'N/A';
            html += `<tr><td>${label}</td><td>${displayVal}</td></tr>`;
        });

        html += '</tbody></table>';
        document.getElementById('dataSummary').innerHTML = html;
    }

    function formatYearLabel(yearKey) {
        // Expecting "20242025" -> "2024-2025"
        if (yearKey.length === 8) {
            return `${yearKey.substring(0, 4)}-${yearKey.substring(4)}`;
        }
        return yearKey;
    }

    function renderChart(labels, data) {
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Gradient for the line
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.5)'); // Primary color with opacity
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Chronic Absenteeism Rate (%)',
                    data: data,
                    borderColor: '#2563eb', // Primary color
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    fill: true,
                    tension: 0.3 // Smooth curves
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        titleFont: {
                            family: 'Inter',
                            size: 14
                        },
                        bodyFont: {
                            family: 'Inter',
                            size: 14,
                            weight: 'bold'
                        },
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                return context.parsed.y + '% Chronically Absent';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Chronic Absent Percent',
                            font: {
                                family: 'Inter',
                                weight: '500'
                            }
                        },
                        grid: {
                            borderDash: [2, 4],
                            color: '#e2e8f0'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'School Year',
                            font: {
                                family: 'Inter',
                                weight: '500'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    function showLoading(show) {
        if (show) loadingIndicator.classList.remove('hidden');
        else loadingIndicator.classList.add('hidden');
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }
});
