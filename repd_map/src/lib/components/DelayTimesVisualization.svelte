<!-- DelayTimesVisualization.svelte -->
<script>
    import { onMount } from 'svelte';
    import { scaleLinear, scaleBand } from 'd3-scale';
    import { max } from 'd3-array';
    import { area } from 'd3-shape';
    import { axisBottom, axisLeft } from 'd3-axis';
    import { select } from 'd3-selection';
    import { transition } from 'd3-transition';
    import { gsap } from 'gsap';
    export let delayData = null

    // Generate sample data for 20 years
    const generateData = () => {
      const years = [];
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 5;
      
      // Create data for each year with random average delay and distribution data
      for (let i = 0; i < 6; i++) {
        const year = startYear + i;
        const avgDelay = Math.round((Math.random() * 10 + 5) * 10) / 10; // Between 5-15 minutes
        
        // Create distribution data (delays in various ranges)
        const distribution = [
          { range: '0-5 min', count: Math.floor(Math.random() * 200 + 50) },
          { range: '5-10 min', count: Math.floor(Math.random() * 300 + 100) },
          { range: '10-15 min', count: Math.floor(Math.random() * 250 + 80) },
          { range: '15-20 min', count: Math.floor(Math.random() * 150 + 40) },
          { range: '20+ min', count: Math.floor(Math.random() * 100 + 20) }
        ];
        
        years.push({
          year,
          avgDelay,
          distribution
        });
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
  
    // Dimensions - now using reactive variables
    let containerWidth;
    let containerHeight;
    let width;
    let height;
    let margin = { top: 20, right: 30, bottom: 40, left: 60 };
    let innerWidth;
    let innerHeight;
    
    // References for resize observer
    let barChartRef;
    let distributionChartRef;
    let resizeObserver;
  
    // Update dimensions based on container size
    function updateDimensions() {
      if (!barChartRef) return;
      
      // Get the actual container width
      const containerRect = barChartRef.getBoundingClientRect();
      containerWidth = containerRect.width;
      containerHeight = Math.min(containerWidth * 0.4, 400); // Responsive height (aspect ratio)
      
      // Update dimensions
      width = containerWidth;
      height = containerHeight;
      innerWidth = width - margin.left - margin.right;
      innerHeight = height - margin.top - margin.bottom;
      
      // Force charts to update with new dimensions
      if (data.length) {
        renderBarChart();
      }
      
      if (distributionData.length && (selectedYear || showAllTime)) {
        renderDistributionChart();
      }
    }
  
    // State variables
    let data = [];
    let selectedYear = null;
    let showAllTime = false;
    let distributionData = [];
    let chartTitle = '';
  
    // DOM nodes
    let barChartContainer;
    let distributionChartContainer;
  
    // Initialize
    onMount(() => {
      console.log(delayData)
      // data = generateData();
      data = delayData;

      // Set up ResizeObserver for responsive sizing
      resizeObserver = new ResizeObserver(entries => {
        updateDimensions();
      });
      
      if (barChartRef) {
        resizeObserver.observe(barChartRef);
      }
      handleAllTimeClick()
      // Initial fade-in animation for the entire component
      return () => {
        // Clean up resize observer on component unmount
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    });
  
    // Handle bar click with animation
    function handleBarClick(entry) {
      // Animate the clicked bar
      const clickedBar = select(barChartContainer).select(`.bar[x="${entry.year}"]`);
      gsap.to(clickedBar.node(), {
        fill: '#c0d9ff',
        scale: 1.05,
        transformOrigin: 'bottom',
        duration: 0.3,
        yoyo: true,
        repeat: 1
      });
      
      showAllTime = false;
      selectedYear = entry.year;
      const yearData = data.find(d => d.year === entry.year);
      if (yearData) {
        distributionData = yearData.distribution;
        chartTitle = `Delay Distribution for ${entry.year}`;
        
        // Add a slight delay before rendering the distribution chart for sequential animation
        setTimeout(() => {
          renderDistributionChart();
        }, 300);
      }
    }
  
    // Handle all time button click with animation
    function handleAllTimeClick() {
      // Animate the button
      const button = document.querySelector('.all-time-btn');
      gsap.to(button, {
        scale: 0.95,
        duration: 0.2,
        yoyo: true,
        repeat: 1
      });
      
      selectedYear = null;
      showAllTime = true;
      distributionData = calculateAllTimeDistribution(data);
      chartTitle = 'All-Time Delay Distribution (20 Years)';
      
      // Animate the title change
      const titleElement = document.querySelector('.chart-title');
      gsap.from(titleElement, {
        opacity: 0,
        y: -20,
        duration: 0.5
      });
      
      // Add a slight delay for sequential animation
      setTimeout(() => {
        renderDistributionChart();
      }, 300);
    }
  
    // Render bar chart
    function renderBarChart() {
      if (!barChartRef || !data.length) return;
  
      // Clear previous chart
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
  
      // Scales
      const xScale = scaleBand()
        .domain(data.map(d => d.year))
        .range([0, innerWidth])
        .padding(0.2);
  
      const yScale = scaleLinear()
        .domain([0, max(data, d => d.avgDelay) * 1.1])
        .range([innerHeight, 0]);
  
      // Axes
      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(axisBottom(xScale))
        .selectAll('text')
        .style('text-anchor', 'middle')
        .style('font-size', `${Math.max(8, Math.min(12, width / 50))}px`); // Responsive font size
  
      g.append('g')
        .call(axisLeft(yScale))
        .selectAll('text')
        .style('font-size', `${Math.max(8, Math.min(12, width / 50))}px`); // Responsive font size
  
      // Y-axis label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', `${Math.max(10, Math.min(14, width / 40))}px`) // Responsive font size
        .text('Average Delay (minutes)');
  
      // Bars - with GSAP animation
      const bars = g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.year))
        .attr('width', xScale.bandwidth())
        .attr('height', 0) // Start with zero height
        .attr('fill', '#FF446b')
        .attr('stroke', '#97001b')
        .style('cursor', 'pointer')
        .on('click', (event, d) => handleBarClick(d));
      
      // Animate bars with GSAP
      bars.each(function(d, i) {
        gsap.to(this, {
          y: yScale(d.avgDelay),
          height: innerHeight - yScale(d.avgDelay),
          duration: 0.8,
          ease: "power2.out",
          delay: i * 0.05 // Staggered animation
        });
      });
  
      // Tooltip functionality
      bars.append('title')
        .text(d => `${d.year}: ${d.avgDelay} minutes`);
    }
  
    // Render distribution chart
    function renderDistributionChart() {
      if (!distributionChartRef || !distributionData.length) return;
  
      // Clear previous chart
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
  
      // Scales
      const xScale = scaleBand()
        .domain(distributionData.map(d => d.range))
        .range([0, innerWidth])
        .padding(0.2);
  
      const yScale = scaleLinear()
        .domain([0, max(distributionData, d => d.count) * 1.1])
        .range([innerHeight, 0]);
  
      // Axes
      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(axisBottom(xScale))
        .selectAll('text')
        .style('text-anchor', 'middle')
        .style('font-size', `${Math.max(8, Math.min(12, width / 50))}px`); // Responsive font size
  
      g.append('g')
        .call(axisLeft(yScale))
        .selectAll('text')
        .style('font-size', `${Math.max(8, Math.min(12, width / 50))}px`); // Responsive font size
  
      // Y-axis label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', `${Math.max(10, Math.min(14, width / 40))}px`) // Responsive font size
        .text('Number of Occurrences');
  
      // Area path generator
      const areaGenerator = area()
        .x(d => xScale(d.range) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1(innerHeight); // Start with all points at the bottom for animation
  
      // Area with initial state for animation
      const areaPath = g.append('path')
        .datum(distributionData)
        .attr('fill', '#FF446b')
        .attr('fill-opacity', 0.6)
        .attr('stroke', '#97001b')
        .attr('stroke-width', 1.5)
        .attr('d', areaGenerator);
      
      // Create real area generator for the animation target
      const targetAreaGenerator = area()
        .x(d => xScale(d.range) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1(d => yScale(d.count));
        
      // Animate the area
      gsap.to(distributionData, {
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          // Update the path during animation
          areaPath.attr('d', targetAreaGenerator);
        }
      });
  
      // Points
      const points = g.selectAll('.point')
        .data(distributionData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => xScale(d.range) + xScale.bandwidth() / 2)
        .attr('cy', innerHeight) // Start from bottom
        .attr('r', 0) // Start with zero radius
        .attr('fill', '#FF446b');
      
      // Responsive point size
      const pointRadius = Math.max(3, Math.min(5, width / 150));
      
      // Animate points with GSAP
      points.each(function(d, i) {
        gsap.to(this, {
          cy: yScale(d.count),
          r: pointRadius,
          duration: 1,
          ease: "elastic.out(1, 0.3)",
          delay: 0.2 + i * 0.1 // Staggered animation after area animation
        });
      });


    }
  
    // Handle window resize
    function handleResize() {
      updateDimensions();
    }
    
    // Make sure distribution chart observer is set up
    function setupDistributionObserver() {
      if (distributionChartRef && resizeObserver) {
        resizeObserver.observe(distributionChartRef);
      }
    }
  </script>
  
  <svelte:window on:resize={handleResize} />
  
  <div class="container">
    <h4 class="text-sm">Average Delay Before Cancellation Per Year</h4>

    <div class="chart-container">
      <div bind:this={barChartRef} class="chart"></div>
    </div>
    
    <div class="distribution-controls">
      <h4 class="text-sm">{chartTitle}</h4>
    </div>
      <div class="chart-container distribution-container">
        <div bind:this={distributionChartRef} class="chart" use:setupDistributionObserver></div>
      </div>
  </div>
  
  <style>

  </style>