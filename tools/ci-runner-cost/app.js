// DOM Elements
const inputs = {
    infraCost: document.getElementById('infraCost'),
    fteCount: document.getElementById('fteCount'),
    fteSalary: document.getElementById('fteSalary'),
    adminFee: document.getElementById('adminFee'),
    monthlyMinutes: document.getElementById('monthlyMinutes'),
    smallPct: document.getElementById('smallPct'),
    mediumPct: document.getElementById('mediumPct'),
    largePct: document.getElementById('largePct'),
    saasSmallRate: document.getElementById('saasSmallRate'),
    saasMediumRate: document.getElementById('saasMediumRate'),
    saasLargeRate: document.getElementById('saasLargeRate'),
    saasDiscount: document.getElementById('saasDiscount'),
    optimizationPct: document.getElementById('optimizationPct')
};

// Chart
let lineChart = null;

// Local Storage Key
const STORAGE_KEY = 'cicd-runner-cost-inputs';

// Utility Functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}

function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Cost Calculation Functions
function calculateCurrentSelfHosted(minutes, infraCost, fteCount, fteSalary, adminFee) {
    const infrastructure = infraCost;
    const adminFees = minutes * adminFee;
    const labor = (fteCount * fteSalary) / 12;
    return infrastructure + adminFees + labor;
}

function calculateOptimizedSelfHosted(minutes, infraCost, fteCount, fteSalary, adminFee, optimizationPct) {
    const optimizedInfra = infraCost * (1 - optimizationPct / 100);
    const adminFees = minutes * adminFee;
    const labor = (fteCount * fteSalary) / 12;
    return optimizedInfra + adminFees + labor;
}

function calculateSaaSHosted(minutes, smallPct, mediumPct, largePct, smallRate, mediumRate, largeRate, discount = 0) {
    // Normalize percentages to ensure they sum to 100%
    const total = smallPct + mediumPct + largePct;
    if (total === 0) return 0;

    const normSmall = smallPct / total;
    const normMedium = mediumPct / total;
    const normLarge = largePct / total;

    const smallCost = (minutes * normSmall) * smallRate;
    const mediumCost = (minutes * normMedium) * mediumRate;
    const largeCost = (minutes * normLarge) * largeRate;
    const baseCost = smallCost + mediumCost + largeCost;
    return baseCost * (1 - discount / 100);
}

// Get normalized percentages
function getNormalizedPercentages(smallPct, mediumPct, largePct) {
    const total = smallPct + mediumPct + largePct;
    // If all zero, use equal split
    if (total === 0) return { small: 33.33, medium: 33.33, large: 33.34 };
    return {
        small: (smallPct / total) * 100,
        medium: (mediumPct / total) * 100,
        large: (largePct / total) * 100
    };
}

// Calculate cost structure (fixed + variable) for each scenario
function getCostStructure(values) {
    const norm = getNormalizedPercentages(values.smallPct, values.mediumPct, values.largePct);

    // Self-hosted: fixed costs + variable admin fee per minute
    const currentFixed = values.infraCost + (values.fteCount * values.fteSalary) / 12;
    const optimizedFixed = values.infraCost * (1 - values.optimizationPct / 100) + (values.fteCount * values.fteSalary) / 12;
    const selfHostedVarRate = values.adminFee;

    // SaaS: no fixed costs, weighted variable rate per minute (with discount)
    const saasBaseRate = (norm.small / 100 * values.saasSmallRate) +
                         (norm.medium / 100 * values.saasMediumRate) +
                         (norm.large / 100 * values.saasLargeRate);
    const saasVarRate = saasBaseRate * (1 - values.saasDiscount / 100);

    return {
        current: { fixed: currentFixed, varRate: selfHostedVarRate },
        optimized: { fixed: optimizedFixed, varRate: selfHostedVarRate },
        saas: { fixed: 0, varRate: saasVarRate, baseRate: saasBaseRate, discount: values.saasDiscount }
    };
}

// Calculate crossover points between scenarios
function calculateCrossoverPoints(values) {
    const crossovers = [];

    // Fixed costs for self-hosted scenarios
    const currentFixed = values.infraCost + (values.fteCount * values.fteSalary) / 12;
    const optimizedFixed = values.infraCost * (1 - values.optimizationPct / 100) + (values.fteCount * values.fteSalary) / 12;

    // Variable cost per minute for self-hosted
    const selfHostedVarRate = values.adminFee;

    // Variable cost per minute for SaaS (weighted average based on mix, with discount)
    const norm = getNormalizedPercentages(values.smallPct, values.mediumPct, values.largePct);
    const saasBaseRate = (norm.small / 100 * values.saasSmallRate) +
                         (norm.medium / 100 * values.saasMediumRate) +
                         (norm.large / 100 * values.saasLargeRate);
    const saasVarRate = saasBaseRate * (1 - values.saasDiscount / 100);

    // Current Self-Hosted vs SaaS: currentFixed + minutes * selfHostedVarRate = minutes * saasVarRate
    // currentFixed = minutes * (saasVarRate - selfHostedVarRate)
    // minutes = currentFixed / (saasVarRate - selfHostedVarRate)
    if (saasVarRate !== selfHostedVarRate) {
        const crossoverCurrentVsSaas = currentFixed / (saasVarRate - selfHostedVarRate);
        if (crossoverCurrentVsSaas > 0) {
            crossovers.push({
                label: 'Current Self-Hosted vs SaaS',
                minutes: crossoverCurrentVsSaas,
                cost: calculateSaaSHosted(crossoverCurrentVsSaas, values.smallPct, values.mediumPct, values.largePct,
                                          values.saasSmallRate, values.saasMediumRate, values.saasLargeRate, values.saasDiscount),
                cheaper_below: saasVarRate > selfHostedVarRate ? 'SaaS' : 'Current Self-Hosted',
                cheaper_above: saasVarRate > selfHostedVarRate ? 'Current Self-Hosted' : 'SaaS'
            });
        }
    }

    // Optimized Self-Hosted vs SaaS
    if (saasVarRate !== selfHostedVarRate) {
        const crossoverOptimizedVsSaas = optimizedFixed / (saasVarRate - selfHostedVarRate);
        if (crossoverOptimizedVsSaas > 0) {
            crossovers.push({
                label: 'Optimized Self-Hosted vs SaaS',
                minutes: crossoverOptimizedVsSaas,
                cost: calculateSaaSHosted(crossoverOptimizedVsSaas, values.smallPct, values.mediumPct, values.largePct,
                                          values.saasSmallRate, values.saasMediumRate, values.saasLargeRate, values.saasDiscount),
                cheaper_below: saasVarRate > selfHostedVarRate ? 'SaaS' : 'Optimized Self-Hosted',
                cheaper_above: saasVarRate > selfHostedVarRate ? 'Optimized Self-Hosted' : 'SaaS'
            });
        }
    }

    return crossovers;
}

// Get Input Values
function getInputValues() {
    return {
        infraCost: parseFloat(inputs.infraCost.value) || 0,
        fteCount: parseFloat(inputs.fteCount.value) || 0,
        fteSalary: parseFloat(inputs.fteSalary.value) || 0,
        adminFee: parseFloat(inputs.adminFee.value) || 0,
        monthlyMinutes: parseFloat(inputs.monthlyMinutes.value) || 0,
        smallPct: parseFloat(inputs.smallPct.value) || 0,
        mediumPct: parseFloat(inputs.mediumPct.value) || 0,
        largePct: parseFloat(inputs.largePct.value) || 0,
        saasSmallRate: parseFloat(inputs.saasSmallRate.value) || 0,
        saasMediumRate: parseFloat(inputs.saasMediumRate.value) || 0,
        saasLargeRate: parseFloat(inputs.saasLargeRate.value) || 0,
        saasDiscount: parseFloat(inputs.saasDiscount.value) || 0,
        optimizationPct: parseFloat(inputs.optimizationPct.value) || 0
    };
}

// Save to Local Storage
function saveToLocalStorage() {
    const values = {};
    Object.keys(inputs).forEach(key => {
        values[key] = inputs[key].value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

// Load from Local Storage
function loadFromLocalStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const values = JSON.parse(stored);
            Object.keys(values).forEach(key => {
                if (inputs[key]) {
                    inputs[key].value = values[key];
                }
            });
        } catch (e) {
            console.warn('Failed to load saved inputs:', e);
        }
    }
}

// Save to URL
function saveToURL() {
    const params = new URLSearchParams();
    Object.keys(inputs).forEach(key => {
        params.set(key, inputs[key].value);
    });
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newURL);
}

// Load from URL
function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.toString() === '') return false;

    let loaded = false;
    Object.keys(inputs).forEach(key => {
        if (params.has(key)) {
            inputs[key].value = params.get(key);
            loaded = true;
        }
    });
    return loaded;
}

const debouncedSaveToURL = debounce(saveToURL, 500);

// Validate inputs and mark empty fields
function validateInputs() {
    Object.values(inputs).forEach(input => {
        if (input.value === '' || input.value === null) {
            input.classList.add('input-empty');
        } else {
            input.classList.remove('input-empty');
        }
    });
}

// Update Slider and Input Displays
function updateSliderDisplays() {
    const values = getInputValues();

    // Update optimization slider display
    document.getElementById('optimizationPctValue').textContent = `${values.optimizationPct}%`;

    // Update SaaS discount slider display
    document.getElementById('saasDiscountValue').textContent = `${values.saasDiscount}%`;

    // Update runner mix validation
    const rawTotal = values.smallPct + values.mediumPct + values.largePct;
    const mixTotalElement = document.getElementById('mixTotal');
    const mixValidation = document.getElementById('mixValidation');

    if (rawTotal === 0) {
        mixTotalElement.textContent = '0%';
        mixValidation.textContent = 'Total is 0% — using equal split (33/33/33)';
        mixValidation.className = 'mix-validation visible error';
    } else if (rawTotal !== 100) {
        mixTotalElement.textContent = `${rawTotal}%`;
        mixValidation.textContent = `Total is ${rawTotal}% — will be normalized to 100%`;
        mixValidation.className = 'mix-validation visible warning';
    } else {
        mixTotalElement.textContent = '100%';
        mixValidation.textContent = '✓ Total equals 100%';
        mixValidation.className = 'mix-validation visible valid';
    }
}

// Generate data points for line chart
function generateLineChartData(values) {
    const maxMinutes = Math.max(values.monthlyMinutes * 2, 1000000);
    const numPoints = 100;
    const step = maxMinutes / numPoints;
    const dataPoints = [];

    for (let i = 0; i <= numPoints; i++) {
        const minutes = i * step;
        const current = calculateCurrentSelfHosted(
            minutes, values.infraCost, values.fteCount, values.fteSalary, values.adminFee
        );
        const optimized = calculateOptimizedSelfHosted(
            minutes, values.infraCost, values.fteCount, values.fteSalary, values.adminFee, values.optimizationPct
        );
        const saas = calculateSaaSHosted(
            minutes, values.smallPct, values.mediumPct, values.largePct,
            values.saasSmallRate, values.saasMediumRate, values.saasLargeRate, values.saasDiscount
        );

        dataPoints.push({
            x: minutes,
            current,
            optimized,
            saas
        });
    }

    return dataPoints;
}

// Initialize Line Chart with proper linear x-axis
function initLineChart() {
    const ctx = document.getElementById('lineChart').getContext('2d');
    const values = getInputValues();
    const data = generateLineChartData(values);

    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Current Self-Hosted',
                    data: data.map(d => ({ x: d.x, y: d.current })),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Optimized Self-Hosted',
                    data: data.map(d => ({ x: d.x, y: d.optimized })),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'SaaS Hosted',
                    data: data.map(d => ({ x: d.x, y: d.saas })),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        },
                        title: function(context) {
                            return `${formatNumber(Math.round(context[0].parsed.x))} minutes`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        currentUsage: {
                            type: 'line',
                            xMin: values.monthlyMinutes,
                            xMax: values.monthlyMinutes,
                            borderColor: '#10b981',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                display: true,
                                content: 'Current Usage',
                                position: 'start',
                                backgroundColor: '#10b981'
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Monthly Minutes'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    },
                    min: 0
                },
                y: {
                    title: {
                        display: true,
                        text: 'Total Monthly Cost'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Update Charts
function updateCharts() {
    const values = getInputValues();
    const data = generateLineChartData(values);

    // Update line chart data
    lineChart.data.datasets[0].data = data.map(d => ({ x: d.x, y: d.current }));
    lineChart.data.datasets[1].data = data.map(d => ({ x: d.x, y: d.optimized }));
    lineChart.data.datasets[2].data = data.map(d => ({ x: d.x, y: d.saas }));

    // Update annotation
    lineChart.options.plugins.annotation.annotations.currentUsage.xMin = values.monthlyMinutes;
    lineChart.options.plugins.annotation.annotations.currentUsage.xMax = values.monthlyMinutes;

    // Update x-axis max
    lineChart.options.scales.x.max = Math.max(values.monthlyMinutes * 2, 1000000);

    lineChart.update();
}

// Update Cost Structure Display
function updateCostStructure() {
    const values = getInputValues();
    const structure = getCostStructure(values);
    const container = document.getElementById('costStructure');
    if (!container) return;

    // Show discount info for SaaS if discount is applied
    const saasRateDisplay = structure.saas.discount > 0
        ? `$${structure.saas.baseRate.toFixed(4)} − ${structure.saas.discount}% = $${structure.saas.varRate.toFixed(4)}/min`
        : `$${structure.saas.varRate.toFixed(4)}/min`;

    container.innerHTML = `
        <div class="cost-structure-item">
            <span class="cost-structure-label">Current Self-Hosted</span>
            <span class="cost-structure-formula">${formatCurrency(structure.current.fixed)} fixed + $${structure.current.varRate.toFixed(4)}/min</span>
        </div>
        <div class="cost-structure-item">
            <span class="cost-structure-label">Optimized Self-Hosted</span>
            <span class="cost-structure-formula">${formatCurrency(structure.optimized.fixed)} fixed + $${structure.optimized.varRate.toFixed(4)}/min</span>
        </div>
        <div class="cost-structure-item">
            <span class="cost-structure-label">SaaS Hosted</span>
            <span class="cost-structure-formula">${formatCurrency(structure.saas.fixed)} fixed + ${saasRateDisplay}</span>
        </div>
    `;
}

// Update Crossover Points Display
function updateCrossoverPoints() {
    const values = getInputValues();
    const crossovers = calculateCrossoverPoints(values);
    const structure = getCostStructure(values);
    const container = document.getElementById('crossoverPoints');

    if (crossovers.length === 0) {
        container.innerHTML = '<p class="no-crossover">No crossover points found (lines don\'t intersect in positive range)</p>';
        return;
    }

    let html = '';
    crossovers.forEach(cp => {
        const isBelow = values.monthlyMinutes < cp.minutes;
        const yourPosition = isBelow ? cp.cheaper_below : cp.cheaper_above;

        // Determine which fixed cost applies based on the label
        const isOptimized = cp.label.includes('Optimized');
        const selfHostedFixed = isOptimized ? structure.optimized.fixed : structure.current.fixed;

        html += `
            <div class="crossover-item">
                <div class="crossover-label">${cp.label}</div>
                <div class="crossover-value">
                    <strong>${formatNumber(Math.round(cp.minutes))}</strong> minutes
                    <span class="crossover-cost">(${formatCurrency(cp.cost)})</span>
                </div>
                <div class="crossover-formula">
                    <span class="formula-label">Formula:</span> Fixed ÷ (SaaS rate − Per-minute fee)<br>
                    <span class="formula-calc">${formatCurrency(selfHostedFixed)} ÷ ($${structure.saas.varRate.toFixed(4)} − $${structure.current.varRate.toFixed(4)}) = ${formatNumber(Math.round(cp.minutes))}</span>
                </div>
                <div class="crossover-insight">
                    Below: <span class="cheaper">${cp.cheaper_below}</span> is cheaper<br>
                    Above: <span class="cheaper">${cp.cheaper_above}</span> is cheaper
                </div>
                <div class="crossover-you">
                    You are ${isBelow ? 'below' : 'above'} this point → <strong>${yourPosition}</strong> is cheaper for you
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Update Data Table
function updateDataTable() {
    const values = getInputValues();
    const norm = getNormalizedPercentages(values.smallPct, values.mediumPct, values.largePct);

    // Calculate costs
    const current = calculateCurrentSelfHosted(
        values.monthlyMinutes, values.infraCost, values.fteCount, values.fteSalary, values.adminFee
    );
    const optimized = calculateOptimizedSelfHosted(
        values.monthlyMinutes, values.infraCost, values.fteCount, values.fteSalary, values.adminFee, values.optimizationPct
    );
    const saas = calculateSaaSHosted(
        values.monthlyMinutes, values.smallPct, values.mediumPct, values.largePct,
        values.saasSmallRate, values.saasMediumRate, values.saasLargeRate, values.saasDiscount
    );

    // Component breakdown
    const currentInfra = values.infraCost;
    const optimizedInfra = values.infraCost * (1 - values.optimizationPct / 100);
    const adminFees = values.monthlyMinutes * values.adminFee;
    const labor = (values.fteCount * values.fteSalary) / 12;

    // SaaS costs using normalized percentages (before discount)
    const saasSmall = (values.monthlyMinutes * norm.small / 100) * values.saasSmallRate;
    const saasMedium = (values.monthlyMinutes * norm.medium / 100) * values.saasMediumRate;
    const saasLarge = (values.monthlyMinutes * norm.large / 100) * values.saasLargeRate;
    const saasSubtotal = saasSmall + saasMedium + saasLarge;
    const saasDiscountAmount = saasSubtotal * (values.saasDiscount / 100);

    // Build table body with fixed/variable grouping
    const tbody = document.getElementById('breakdownBody');
    tbody.innerHTML = `
        <tr class="group-header">
            <td colspan="4">Fixed Costs <span class="group-note">(do not change with usage)</span></td>
        </tr>
        <tr>
            <td>Infrastructure</td>
            <td><span class="cost-value">${formatCurrency(currentInfra)}</span></td>
            <td>
                <span class="cost-value">${formatCurrency(optimizedInfra)}</span>
                <div class="formula">${formatCurrency(values.infraCost)} × ${(1 - values.optimizationPct / 100).toFixed(2)}</div>
            </td>
            <td>—</td>
        </tr>
        <tr>
            <td>Labor (FTE)</td>
            <td>
                <span class="cost-value">${formatCurrency(labor)}</span>
                <div class="formula">${values.fteCount} × ${formatCurrency(values.fteSalary)} / 12</div>
            </td>
            <td>
                <span class="cost-value">${formatCurrency(labor)}</span>
                <div class="formula">${values.fteCount} × ${formatCurrency(values.fteSalary)} / 12</div>
            </td>
            <td>—</td>
        </tr>
        <tr class="group-header">
            <td colspan="4">Variable Costs <span class="group-note">(per-minute charges)</span></td>
        </tr>
        <tr>
            <td>Per-Minute Fees</td>
            <td>
                <span class="cost-value">${formatCurrency(adminFees)}</span>
                <div class="formula">${formatNumber(values.monthlyMinutes)} × $${values.adminFee.toFixed(4)}</div>
            </td>
            <td>
                <span class="cost-value">${formatCurrency(adminFees)}</span>
                <div class="formula">${formatNumber(values.monthlyMinutes)} × $${values.adminFee.toFixed(4)}</div>
            </td>
            <td>—</td>
        </tr>
        <tr>
            <td>Small Runners (${Math.round(norm.small)}%)</td>
            <td>—</td>
            <td>—</td>
            <td>
                <span class="cost-value">${formatCurrency(saasSmall)}</span>
                <div class="formula">${formatNumber(values.monthlyMinutes)} × ${norm.small.toFixed(1)}% × $${values.saasSmallRate.toFixed(4)}</div>
            </td>
        </tr>
        <tr>
            <td>Medium Runners (${Math.round(norm.medium)}%)</td>
            <td>—</td>
            <td>—</td>
            <td>
                <span class="cost-value">${formatCurrency(saasMedium)}</span>
                <div class="formula">${formatNumber(values.monthlyMinutes)} × ${norm.medium.toFixed(1)}% × $${values.saasMediumRate.toFixed(4)}</div>
            </td>
        </tr>
        <tr>
            <td>Large Runners (${Math.round(norm.large)}%)</td>
            <td>—</td>
            <td>—</td>
            <td>
                <span class="cost-value">${formatCurrency(saasLarge)}</span>
                <div class="formula">${formatNumber(values.monthlyMinutes)} × ${norm.large.toFixed(1)}% × $${values.saasLargeRate.toFixed(4)}</div>
            </td>
        </tr>
        ${values.saasDiscount > 0 ? `
        <tr class="discount-row">
            <td>Account Discount (${values.saasDiscount}%)</td>
            <td>—</td>
            <td>—</td>
            <td>
                <span class="cost-value diff-negative">−${formatCurrency(saasDiscountAmount)}</span>
                <div class="formula">${formatCurrency(saasSubtotal)} × ${values.saasDiscount}%</div>
            </td>
        </tr>
        ` : ''}
    `;

    // Calculate differences
    const optimizedDiff = optimized - current;
    const optimizedDiffPct = current > 0 ? (optimizedDiff / current) * 100 : 0;
    const saasDiff = saas - current;
    const saasDiffPct = current > 0 ? (saasDiff / current) * 100 : 0;

    // Build table footer
    const tfoot = document.getElementById('breakdownFooter');
    tfoot.innerHTML = `
        <tr>
            <td><strong>Total Monthly Cost</strong></td>
            <td><strong>${formatCurrency(current)}</strong></td>
            <td><strong>${formatCurrency(optimized)}</strong></td>
            <td><strong>${formatCurrency(saas)}</strong></td>
        </tr>
        <tr>
            <td><strong>Difference vs. Current</strong></td>
            <td>—</td>
            <td class="${optimizedDiff < 0 ? 'diff-negative' : 'diff-positive'}">
                <strong>${optimizedDiff < 0 ? '-' : '+'}${formatCurrency(Math.abs(optimizedDiff))} (${formatPercent(Math.abs(optimizedDiffPct))})</strong>
                <div class="formula">${optimizedDiff < 0 ? 'Savings' : 'More expensive'}</div>
            </td>
            <td class="${saasDiff < 0 ? 'diff-negative' : 'diff-positive'}">
                <strong>${saasDiff < 0 ? '-' : '+'}${formatCurrency(Math.abs(saasDiff))} (${formatPercent(Math.abs(saasDiffPct))})</strong>
                <div class="formula">${saasDiff < 0 ? 'Savings' : 'More expensive'}</div>
            </td>
        </tr>
    `;
}

// Update Executive Summary
function updateExecutiveSummary() {
    const values = getInputValues();
    const minutes = values.monthlyMinutes;

    const current = calculateCurrentSelfHosted(
        minutes, values.infraCost, values.fteCount, values.fteSalary, values.adminFee
    );
    const optimized = calculateOptimizedSelfHosted(
        minutes, values.infraCost, values.fteCount, values.fteSalary, values.adminFee, values.optimizationPct
    );
    const saas = calculateSaaSHosted(
        minutes, values.smallPct, values.mediumPct, values.largePct,
        values.saasSmallRate, values.saasMediumRate, values.saasLargeRate, values.saasDiscount
    );

    const scenarios = [
        { name: 'Current Self-Hosted', cost: current, key: 'current' },
        { name: 'Optimized Self-Hosted', cost: optimized, key: 'optimized' },
        { name: 'SaaS Hosted', cost: saas, key: 'saas' }
    ];

    const cheapest = scenarios.reduce((a, b) => a.cost < b.cost ? a : b);
    const savings = current - cheapest.cost;

    // Calculate required infra reduction to match SaaS
    const labor = (values.fteCount * values.fteSalary) / 12;
    const adminFees = minutes * values.adminFee;
    const targetInfra = saas - adminFees - labor;
    const requiredReduction = values.infraCost > 0 ? ((values.infraCost - targetInfra) / values.infraCost) * 100 : 0;

    // Update recommendation text
    const recommendationEl = document.getElementById('recommendation');
    if (cheapest.key === 'current') {
        recommendationEl.innerHTML = `At <strong>${formatNumber(minutes)}</strong> minutes/month, <span class="option-name">Current Self-Hosted</span> is already your cheapest option.`;
    } else {
        recommendationEl.innerHTML = `At <strong>${formatNumber(minutes)}</strong> minutes/month, <span class="option-name highlight">${cheapest.name}</span> is cheapest.`;
    }

    // Update cost cards
    const costsEl = document.getElementById('summaryCosts');
    let costsHtml = scenarios.map(s => `
        <div class="summary-cost-item ${s.key === cheapest.key ? 'cheapest' : ''}">
            <div class="summary-cost-label">${s.name}</div>
            <div class="summary-cost-value">${formatCurrency(s.cost)}/mo</div>
            <div class="summary-cost-annual">${formatCurrency(s.cost * 12)}/year</div>
        </div>
    `).join('');

    // Add savings callout if applicable
    if (savings > 0) {
        costsHtml += `
            <div class="summary-savings">
                Switching to <strong>${cheapest.name}</strong> saves <strong>${formatCurrency(savings)}/month</strong> (${formatCurrency(savings * 12)}/year)
            </div>
        `;
    }

    // Add required infra reduction insight when SaaS is cheaper than current self-hosted
    if (saas < current && cheapest.key === 'saas') {
        if (targetInfra < 0) {
            // Even with $0 infra, self-hosted would still cost more
            const minSelfHosted = adminFees + labor;
            const excess = minSelfHosted - saas;
            costsHtml += `
                <div class="summary-insight warning">
                    Even with <strong>$0 infrastructure</strong>, self-hosted would cost <strong>${formatCurrency(excess)}/month more</strong> than SaaS due to labor + admin fees.
                </div>
            `;
        } else {
            costsHtml += `
                <div class="summary-insight">
                    To match SaaS costs, reduce infrastructure by <strong>${formatPercent(requiredReduction)}</strong> (from ${formatCurrency(values.infraCost)} to ${formatCurrency(targetInfra)}/month).
                </div>
            `;
        }
    }

    costsEl.innerHTML = costsHtml;
}

// Update Crossover Preview
function updateCrossoverPreview() {
    const values = getInputValues();
    const crossovers = calculateCrossoverPoints(values);
    const preview = document.getElementById('crossoverPreview');
    if (!preview) return;

    if (crossovers.length === 0) {
        preview.textContent = 'No break-even points';
        return;
    }

    // Find most relevant crossover (Current vs SaaS)
    const cp = crossovers.find(c => c.label.includes('Current')) || crossovers[0];
    const minutesK = Math.round(cp.minutes / 1000);

    if (minutesK >= 1000) {
        preview.textContent = `${cp.cheaper_below} cheaper below ${(minutesK/1000).toFixed(1)}M min`;
    } else {
        preview.textContent = `${cp.cheaper_below} cheaper below ${minutesK}K min`;
    }
}

// Update Accordion Summaries
function updateAccordionSummaries() {
    const values = getInputValues();

    // Infrastructure summary
    const labor = (values.fteCount * values.fteSalary) / 12;
    const totalInfra = values.infraCost + labor;
    const infraSummary = document.getElementById('infraSummary');
    if (infraSummary) {
        if (totalInfra >= 1000) {
            infraSummary.textContent = `$${Math.round(totalInfra / 1000)}K/mo`;
        } else {
            infraSummary.textContent = formatCurrency(totalInfra) + '/mo';
        }
    }
}

// Update Everything
function updateAll() {
    validateInputs();
    updateSliderDisplays();
    updateCharts();
    updateExecutiveSummary();
    updateCostStructure();
    updateCrossoverPoints();
    updateDataTable();
    updateCrossoverPreview();
    updateAccordionSummaries();
    saveToLocalStorage();
    debouncedSaveToURL();
}

// Event Listeners
Object.values(inputs).forEach(input => {
    input.addEventListener('input', updateAll);
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // URL takes priority, fall back to localStorage
    if (!loadFromURL()) {
        loadFromLocalStorage();
    }
    updateSliderDisplays();
    initLineChart();
    updateExecutiveSummary();
    updateCostStructure();
    updateCrossoverPoints();
    updateDataTable();
    updateCrossoverPreview();
    updateAccordionSummaries();
});
