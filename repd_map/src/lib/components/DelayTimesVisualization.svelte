<!-- DelayTimesVisualization.svelte -->
<script>
    import { onMount } from 'svelte';
    import { scaleLinear, scaleBand } from 'd3-scale';
    import { max } from 'd3-array';
    import { area, curveCardinal } from 'd3-shape';
    import { axisBottom, axisLeft } from 'd3-axis';
    import { select } from 'd3-selection';
    import { transition } from 'd3-transition';
    import { gsap } from 'gsap';
    
    export let delayData = null;

    // Generate sample data for testing
    const generateData = () => {
      const years = [];
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 5;
      
      for (let i = 0; i < 6; i++) {
        const year = startYear + i;
        const avgDelay = Math.round((Math.random() * 10 + 5) * 10) / 10;
        
        const distribution = [
          { range: '0-5 min', count: Math.floor(Math.random() * 200 + 50) },
          { range: '5-10 min', count: Math.floor(Math.random() * 300 + 100) },
          { range: '10-15 min', count: Math.floor(Math.random() * 250 + 80) },
          { range: '15-20 min', count: Math.floor(Math.random() * 150 + 40) },
          { range: '20+ min', count: Math.floor(Math.random() * 100 + 20) }
        ];
        
        years.push({ year, avgDelay, distribution });
      }
      return years;
    };

    // Create all-time distribution by combining all years
    const calculateAllTimeDistribution = (data) => {
      const allTimeDistribution = [
        { range: '0-90 days', count: 0 },
        { range: '90-180 days', count: 0 },
        { range: '180-365 days', count: 0 },
        { range: '1 Year - 2 Years', count: 0 },
        { range: 'Over 2 Years', count: 0 }
      ];
      
      data.forEach(yearData => {
        yearData.distribution.forEach((item, index) => {
          allTimeDistribution[index].count += item.count;
        });
      });
      
      return allTimeDistribution;
    };

    // Dimensions
    let containerWidth;
    let containerHeight;
    let width;
    let height;
    let margin = { top: 20, right: 30, bottom: 40, left: 60 };
    let innerWidth;
    let innerHeight;
    
    // References
    let mainContainer;
    let barChartRef;
    let distributionChartRef;
    let resizeObserver;
    
    // State variables
    let data = [];
    let selectedYear = null;
    let showAllTime = false;
    let distributionData = [];
    let chartTitle = '';
    let currentView = 'overview'; // 'overview' or 'distribution'
    
    // DOM nodes
    let barChartContainer;
    let distributionChartContainer;
    
    // Animation timeline
    let tl;

    // Update dimensions
    function updateDimensions() {
      if (!mainContainer) return;
      
      const containerRect = mainContainer.getBoundingClientRect();
      containerWidth = containerRect.width;
      containerHeight = Math.min(containerWidth * 0.4, 400);
      
      width = containerWidth;
      height = containerHeight;
      innerWidth = width - margin.left - margin.right;
      innerHeight = height - margin.top - margin.bottom;
      
      if (data.length && currentView === 'overview') {
        renderBarChart();
      }
      
      if (distributionData.length && currentView === 'distribution') {
        renderDistributionChart();
      }
    }

    // Initialize
    onMount(() => {
      data = delayData || generateData();
      
      resizeObserver = new ResizeObserver(entries => {
        updateDimensions();
      });
      
      if (mainContainer) {
        resizeObserver.observe(mainContainer);
      }
      
      // Initial setup
      updateDimensions();
      renderBarChart();
      
      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    });

    // Enhanced bar click with zoom animation
    function handleBarClick(entry) {
      if (currentView === 'distribution') return;
      
      // Create timeline for complex animation sequence
      tl = gsap.timeline();
      
      // 1. Highlight clicked bar
      const clickedBar = select(barChartContainer).select(`[data-year="${entry.year}"]`);
      tl.to(clickedBar.node(), {
        fill: '#c0d9ff',
        scale: 1.1,
        transformOrigin: 'bottom center',
        duration: 0.3,
        ease: "power2.out"
      });
      
      // 2. Fade out other bars
      const otherBars = select(barChartContainer).selectAll('.bar').filter(d => d.year !== entry.year);
      tl.to(otherBars.nodes(), {
        opacity: 0.3,
        scale: 0.9,
        transformOrigin: 'bottom center',
        duration: 0.3,
        ease: "power2.out"
      }, "-=0.2");
      
      // 3. Zoom and fade transition
      tl.to(barChartRef, {
        scale: 0.8,
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut"
      }, "+=0.1");
      
      // 4. Switch views and prepare distribution data
      tl.call(() => {
        currentView = 'distribution';
        showAllTime = false;
        selectedYear = entry.year;
        const yearData = data.find(d => d.year === entry.year);
        if (yearData) {
          distributionData = yearData.distribution;
          chartTitle = `Delay Distribution for ${entry.year}`;
        }
      });
      
      // 5. Animate distribution chart in
      tl.fromTo(distributionChartRef, {
        scale: 0.8,
        opacity: 0,
        rotationY: 15
      }, {
        scale: 1,
        opacity: 1,
        rotationY: 0,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.2");
      
      // 6. Render the distribution chart
      tl.call(() => {
        renderDistributionChart();
      }, null, "-=0.3");
    }

    // Enhanced back to overview with zoom out animation
    function handleBackToOverview() {
      if (currentView === 'overview') return;
      
      tl = gsap.timeline();
      
      // 1. Fade out distribution chart with 3D effect
      tl.to(distributionChartRef, {
        scale: 0.8,
        opacity: 0,
        rotationY: -15,
        duration: 0.4,
        ease: "power2.inOut"
      });
      
      // 2. Switch back to overview
      tl.call(() => {
        currentView = 'overview';
        selectedYear = null;
        showAllTime = false;
        chartTitle = '';
      });
      
      // 3. Reset and show bar chart
      tl.fromTo(barChartRef, {
        scale: 0.8,
        opacity: 0
      }, {
        scale: 1,
        opacity: 1,
        duration: 0.2,
        ease: "power2.out"
      }, "-=0.2");
      
      // 4. Re-render bar chart
      tl.call(() => {
        renderBarChart();
      }, null, "-=0.3");
    }

    // Enhanced all-time click
    function handleAllTimeClick() {
      if (currentView === 'distribution') return;
      
      tl = gsap.timeline();
      
      // Animate button
      const button = document.querySelector('.all-time-btn');
      tl.to(button, {
        scale: 0.95,
        duration: 0.2,
        yoyo: true,
        repeat: 1
      });
      
      // Zoom transition similar to bar click
      tl.to(barChartRef, {
        scale: 1.2,
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut"
      }, "-=0.1");
      
      tl.call(() => {
        currentView = 'distribution';
        selectedYear = null;
        showAllTime = true;
        distributionData = calculateAllTimeDistribution(data);
        chartTitle = 'All-Time Delay Distribution';
      });
      
      tl.fromTo(distributionChartRef, {
        scale: 0.8,
        opacity: 0,
        rotationY: 15
      }, {
        scale: 1,
        opacity: 1,
        rotationY: 0,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.2");
      
      tl.call(() => {
        renderDistributionChart();
      }, null, "-=0.3");
    }

    // Enhanced bar chart rendering
    function renderBarChart() {
      if (!barChartRef || !data.length) return;

      select(barChartRef).selectAll('*').remove();

      const svg = select(barChartRef)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const xScale = scaleBand()
        .domain(data.map(d => d.year))
        .range([0, innerWidth])
        .padding(0.2);

      const yScale = scaleLinear()
        .domain([0, max(data, d => d.avgDelay) * 1.1])
        .range([innerHeight, 0]);

      // Enhanced axes with better styling
      const xAxis = g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(axisBottom(xScale));
      
      xAxis.selectAll('text')
        .style('text-anchor', 'middle')
        .style('font-size', `${Math.max(10, Math.min(14, width / 40))}px`)
        .style('font-weight', '500');

      const yAxis = g.append('g')
        .call(axisLeft(yScale));
      
      yAxis.selectAll('text')
        .style('font-size', `${Math.max(10, Math.min(14, width / 40))}px`)
        .style('font-weight', '500');

      // Enhanced Y-axis label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', `${Math.max(12, Math.min(16, width / 35))}px`)
        .style('font-weight', '600')
        .style('fill', '#374151')
        .text('Avg Delay (days)');

      // Enhanced bars with better interactions
      const bars = g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('data-year', d => d.year)
        .attr('x', d => xScale(d.year))
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', '#eb8e47')
        .attr('stroke', '#b62121')
        .attr('stroke-width', 2)
        .attr('rx', 4)
        .attr('ry', 4)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
        .on('click', (event, d) => handleBarClick(d))
        .on('mouseenter', function(event, d) {
          gsap.to(this, {
            fill: '#b62121',
            y: yScale(d.avgDelay) - 1,
            duration: 0.2,
            ease: "power2.out"
          });
        })
        .on('mouseleave', function(event, d) {
          gsap.to(this, {
            fill: '#eb8e47',
            y: yScale(d.avgDelay),
            duration: 0.2,
            ease: "power2.out"
          });
        });

      // Staggered animation for bars
      bars.each(function(d, i) {
        gsap.fromTo(this, {
          y: innerHeight,
          height: 0,
          opacity: 0
        }, {
          y: yScale(d.avgDelay),
          height: innerHeight - yScale(d.avgDelay),
          opacity: 1,
          duration: 0.8,
          ease: "elastic.out(1, 0.5)",
          delay: i * 0.1
        });
      });

      // Enhanced tooltips
      bars.append('title')
        .text(d => `${d.year}: ${d.avgDelay} minutes average delay`);
    }

    // Enhanced distribution chart with smooth curves
    function renderDistributionChart() {
      if (!distributionChartRef || !distributionData.length) return;

      select(distributionChartRef).selectAll('*').remove();

      const svg = select(distributionChartRef)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const xScale = scaleBand()
        .domain(distributionData.map(d => d.range))
        .range([0, innerWidth])
        .padding(0.1);

      const yScale = scaleLinear()
        .domain([0, max(distributionData, d => d.count) * 1.1])
        .range([innerHeight, 0]);

      // Enhanced axes
      const xAxis = g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(axisBottom(xScale));
      
      xAxis.selectAll('text')
        .style('text-anchor', 'middle')
        .style('font-size', `${Math.max(9, Math.min(12, width / 50))}px`)
        .style('font-weight', '500');

      const yAxis = g.append('g')
        .call(axisLeft(yScale));
      
      yAxis.selectAll('text')
        .style('font-size', `${Math.max(10, Math.min(14, width / 40))}px`)
        .style('font-weight', '500');

      // Enhanced Y-axis label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', `${Math.max(12, Math.min(16, width / 35))}px`)
        .style('font-weight', '600')
        .style('fill', '#374151')
        .text('Number of Occurrences');

      // Smooth curve area with curveCardinal
      const smoothAreaGenerator = area()
        .x(d => xScale(d.range) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1(d => yScale(d.count))
        .curve(curveCardinal.tension(0.3)); // Smooth curve with tension

      // Create gradient for area fill
      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'areaGradient')
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', 0).attr('y2', innerHeight);

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#b62121')
        .attr('stop-opacity', 1);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#eb8e47')
        .attr('stop-opacity', 0.5);

      // Area path with smooth curves
      const areaPath = g.append('path')
        .datum(distributionData)
        .attr('fill', 'url(#areaGradient)')
        .attr('stroke', '#eb8e47')
        .attr('stroke-width', 2)

        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .style('filter', 'drop-shadow(0 4px 8px rgba(255, 68, 107, 0.3))')
        .attr('d', smoothAreaGenerator);

      // Animate area path
      const totalLength = areaPath.node().getTotalLength();
      areaPath
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .attr('stroke-dashoffset', 0);

      // Enhanced points with glow effect
      const points = g.selectAll('.point')
        .data(distributionData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.range) + xScale.bandwidth() / 2)
        .attr('cy', d => yScale(d.count))
        .attr('r', 0)
        .attr('fill', '#eb8e47')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 2px 4px rgba(255, 68, 107, 0.5))')
        .style('cursor', 'pointer');

      // Animate points with elastic effect
      const pointRadius = Math.max(4, Math.min(6, width / 120));
      points.each(function(d, i) {
        const point = this;
        gsap.fromTo(point, {
          r: 0,
          scale: 0
        }, {
          r: pointRadius,
          scale: 1,
          duration: 0.6,
          ease: "elastic.out(1, 0.3)",
          delay: 0.5 + i * 0.1
        });

        // Add hover effects
        select(point)
          .on('mouseenter', function() {
            gsap.to(this, {
              r: pointRadius * 1.5,
              duration: 0.3,
              ease: "power2.out"
            });
          })
          .on('mouseleave', function() {
            gsap.to(this, {
              r: pointRadius,
              duration: 0.3,
              ease: "power2.out"
            });
          });
      });

      // Enhanced tooltips for points
      points.append('title')
        .text(d => `${d.range}: ${d.count} occurrences`);
    }

    // Handle window resize
    function handleResize() {
      updateDimensions();
    }
</script>

<svelte:window on:resize={handleResize} />

<div class="container" bind:this={mainContainer}>
  <div class="header">
    <h3>
      {#if currentView === 'overview'}
        Avg Delay Before Death
      {:else}
        {chartTitle}
      {/if}
    </h3>
    
    {#if currentView === 'overview'}
      <button class="back-btn" on:click={handleAllTimeClick}>
        View All-Time Distribution
      </button>
    {:else}
      <button class="back-btn" on:click={handleBackToOverview}>
        ← Back to Overview
      </button>
    {/if}
  </div>

  <div class="charts-container">
    <div 
      class="chart-wrapper"
      class:hidden={currentView === 'distribution'}
      bind:this={barChartRef}
    ></div>
    
    <div 
      class="chart-wrapper"
      class:hidden={currentView === 'overview'}
      bind:this={distributionChartRef}
    ></div>
  </div>
</div>

<style>
  .container {
    width: 100%;
    /* max-width: 1200px; */
    /* padding: 20px; */
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
    line-height: 1.2;
  }



  .back-btn {
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .back-btn:hover {
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  }

  .charts-container {
    position: relative;
    width: 100%;
    min-height: 200px;
  }

  .chart-wrapper {
    width: 100%;
    height: 100px;
    position: absolute;
    top: 0;
    left: 0;
    transition: opacity 0.3s ease;
  }

  .chart-wrapper.hidden {
    opacity: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .container {
      padding: 15px;
    }

    .header {
      flex-direction: column;
      align-items: stretch;
    }

    .title {
      font-size: 1.25rem;
      text-align: center;
    }

    .all-time-btn, .back-btn {
      width: 100%;
      justify-self: center;
    }
  }
</style>