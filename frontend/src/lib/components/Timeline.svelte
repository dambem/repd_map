<script>
  import { createEventDispatcher } from 'svelte';
  
  export let startDate = '';
  export let endDate = '';
  export let minDate = '2020-01-01';
  export let maxDate = '2024-12-31';
  
  const dispatch = createEventDispatcher();
  
  let isDragging = false;
  let dragTarget = null;
  let sliderRef;
  
  // Convert date string to timestamp for calculations
  function dateToTimestamp(dateStr) {
    return new Date(dateStr).getTime();
  }
  
  // Convert timestamp back to date string
  function timestampToDate(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
  }
  
  // Get position percentage for a date
  function getPositionPercent(dateStr) {
    const timestamp = dateToTimestamp(dateStr);
    const minTimestamp = dateToTimestamp(minDate);
    const maxTimestamp = dateToTimestamp(maxDate);
    return ((timestamp - minTimestamp) / (maxTimestamp - minTimestamp)) * 100;
  }
  
  // Get date from position percentage
  function getDateFromPercent(percent) {
    const minTimestamp = dateToTimestamp(minDate);
    const maxTimestamp = dateToTimestamp(maxDate);
    const timestamp = minTimestamp + (percent / 100) * (maxTimestamp - minTimestamp);
    return timestampToDate(timestamp);
  }
  
  // Handle mouse/touch events
  function handlePointerDown(e, target) {
    isDragging = true;
    dragTarget = target;
    e.preventDefault();
  }
  
  function handlePointerMove(e) {
    if (!isDragging || !sliderRef) return;
    
    const rect = sliderRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newDate = getDateFromPercent(percent);
    
    if (dragTarget === 'start') {
      startDate = newDate;
      // Ensure start date doesn't go past end date
      if (dateToTimestamp(startDate) > dateToTimestamp(endDate)) {
        endDate = startDate;
      }
    } else {
      endDate = newDate;
      // Ensure end date doesn't go before start date
      if (dateToTimestamp(endDate) < dateToTimestamp(startDate)) {
        startDate = endDate;
      }
    }
    
    dispatch('change', { startDate, endDate });
  }
  
  function handlePointerUp() {
    isDragging = false;
    dragTarget = null;
  }
  
  // Format date for display
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  // Initialize default dates if not provided
  if (!startDate) startDate = minDate;
  if (!endDate) endDate = maxDate;
  
  $: startPercent = getPositionPercent(startDate);
  $: endPercent = getPositionPercent(endDate);
</script>

<svelte:window 
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
/>

<div class="timeline-container">
  <div class="timeline-wrapper">
    <!-- Date labels -->
    <div class="date-labels">
      <div class="date-label start" style="left: {startPercent}%">
        {formatDate(startDate)}
      </div>
      <div class="date-label end" style="left: {endPercent}%">
        {formatDate(endDate)}
      </div>
    </div>
    
    <!-- Timeline track -->
    <div class="timeline-track" bind:this={sliderRef}>
      <!-- Background track -->
      <div class="track-bg"></div>
      
      <!-- Active range -->
      <div 
        class="track-active" 
        style="left: {startPercent}%; width: {endPercent - startPercent}%"
      ></div>
      
      <!-- Start handle -->
      <div 
        class="handle start-handle" 
        style="left: {startPercent}%"
        on:pointerdown={(e) => handlePointerDown(e, 'start')}
        role="slider"
        tabindex="0"
        aria-label="Start date"
      ></div>
      
      <!-- End handle -->
      <div 
        class="handle end-handle" 
        style="left: {endPercent}%"
        on:pointerdown={(e) => handlePointerDown(e, 'end')}
        role="slider"
        tabindex="0"
        aria-label="End date"
      ></div>
    </div>
    
    <!-- Min/Max date labels -->

    <!-- Info text -->

  </div>
</div>

<style>
  .timeline-container {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 340px;
    background: rgba(21, 23, 28, 0.88);
    backdrop-filter: blur(6px);
    border-radius: 4px;
    border: 1px solid rgba(232, 228, 218, 0.2);
    padding: 10px 40px 6px;
    z-index: 45;
  }

  .timeline-wrapper {
    position: relative;
    width: 100%;
  }

  .date-labels {
    position: relative;
    height: 22px;
    margin-bottom: 4px;
  }

  .date-label {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    color: var(--ceg-bone);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.05em;
    white-space: nowrap;
    pointer-events: none;
  }

  .date-label.end {
    color: var(--ceg-ember);
  }

  .timeline-track {
    position: relative;
    height: 8px;
    margin: 8px 0 10px;
    cursor: pointer;
    border-radius: 2px;
  }

  .track-bg {
    position: absolute;
    inset: 0;
    background: rgba(232, 228, 218, 0.12);
    border-radius: 2px;
  }

  .track-active {
    position: absolute;
    top: 0;
    height: 100%;
    background: var(--ceg-vermillion);
    border-radius: 2px;
  }

  .handle {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--ceg-bone);
    border: 2px solid var(--ceg-vermillion);
    cursor: grab;
    transition: transform 0.15s ease;
  }

  .handle:hover,
  .handle:focus-visible {
    transform: translate(-50%, -50%) scale(1.2);
    outline: none;
    box-shadow: 0 0 0 3px rgba(200, 64, 31, 0.35);
  }

  .handle:active {
    cursor: grabbing;
  }

  @media (max-width: 640px) {
    .timeline-container {
      width: 95%;
      padding: 8px 28px 4px;
    }
    .handle {
      width: 22px;
      height: 22px;
    }
  }
</style>