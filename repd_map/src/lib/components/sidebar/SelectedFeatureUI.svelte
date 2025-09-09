<script>
    const allowedProperties = ['Operator (or Applicant)', 'Site Name', 'Technology Type', 'Installed Capacity (MWelec)', 'Development Status', 'Planning Permission Refused', 'Planning Application Withdrawn', 'Planning Application Submitted'];
    export let councils = null;
    export let selectedFeature = null;
    export let nimby_choice = null;
    export let resetSelection;
    export let nimbyRadarCanvas;


    let buttonText = 'Copy Ref';
    console.log('Selected Feature:', selectedFeature);
    const copyToClipboard = () => {
        let copy = selectedFeature.properties['Planning Application Reference']
        navigator.clipboard.writeText(copy).then(() => {
            buttonText = "Copied!"
            setTimeout(() => {
                buttonText = 'Copy Ref';
            }, 2000); // Revert the button text after 2 seconds

    })
}
</script>

<div class="bg-white  rounded-xl p-4 shadow-md">
<button class="text-xs text-orange-500 mt-1" on:click={resetSelection}>Back to overview</button>
<h2 class="text-sm font-bold">{selectedFeature.properties['Site Name'] || 'C.E.G'}</h2>
<h3 class="text-sm">Planning Authority: <b>{selectedFeature.properties['Planning Authority']}</b></h3>
<p class='text-xs'>Submitted: {selectedFeature.properties['Planning Application Submitted']}</p>
<h3 class="text-xs font-italic">Reference:  <b>{selectedFeature.properties['Planning Application Reference']}</b></h3>
<button on:click={copyToClipboard} class="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-blue-600">
    {buttonText}
</button>

<br>
<a class='text-sm text-orange-500' target="_blank" href={councils[selectedFeature.properties['Planning Authority']]}> Link To Planning Authority Database</a>

<br>
{#if selectedFeature.properties['Planning Permission Refused'] != 0}
    <p class='text-xs'>Refused: {selectedFeature.properties['Planning Permission Refused']}</p>
{/if}

{#if selectedFeature.properties['Planning Permission Withdraw'] != 0}
    <p class='text-xs'>Withdrawn: {selectedFeature.properties['Planning Permission Withdrawn']}</p>
{/if}
<p class="text-xs font-bold">Record Last Updated {selectedFeature.properties['Record Last Updated (dd/mm/yyyy)']}</p>

</div>
{#if nimby_choice}
<div class="collapse collapse-arrow border-base-300 mt-3 mb-2 border">
    <input type="checkbox" />
    <div class="collapse-title text-sm mb-0 pb-0 bg-white">{selectedFeature.properties['Development Status']}</div>
    <div class="collapse-content bg-white">
        <table class="w-full table rounded-box border border-base-content/5 bg-base-100">

            <tbody>
                {#each Object.entries(selectedFeature.properties).filter(([key]) => allowedProperties.includes(key)) as [key, value]}
                    {#if key !== 'title'}
                        <tr class="property-row"  style="opacity: 1;">
                            <td>{key.replace(/_/g, ' ')}</td>
                            <td>{value}</td>
                        </tr>
                    {/if}
                {/each}
            </tbody>
        </table>
    </div>
</div>
<div class="sidebar-content" bind:this={sidebarContent}>
    <hr/>
    <ul  class="list bg-base-100 rounded-box shadow-md mt-2 mb-2">
        <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">3 'Fun' Facts about this Failure</li>

        {#each nimby_choice['Interesting Tidbits'] || [] as tidbit}
            <li class="list-row p-4">
                <div class='list-col-grow text-sm'>
                    {tidbit}
                </div>
            </li>
        {/each}
    </ul>
    
    <div class="chat chat-start">
        <div class="chat-image avatar">
            <div class="w-10 rounded-full ring-primary ring ring-offset-2">
                <img
                alt="A small butterfly, illustrated"
                src="./gif.gif" />
            </div>
            </div>
        <div class="chat-bubble bg-orange-400  shadow-xl">
            {nimby_choice['Snide Commentary']}
        </div>
        <div class="chat-bubble bg-orange-400 shadow-xl mt-2">
        <p class="text-sm">{nimby_choice['header']}</p>
        </div>
        <div class="chat-footer opacity-50">Sent By C.E.G - He may be wrong! </div>

    </div>
</div>


<div class="flex mt-5 justify-center items-center">
    {#if nimby_choice && nimby_choice['article_url']}
        <a href="{nimby_choice['article_url']}" target="_blank" rel="noopener noreferrer" class="btn btn-primary bg-orange-500 text-white">
            Potential Link/Article About This Project
        </a>
    {:else}
        <!-- <button class="btn btn-primary" on:click={() => showSubmitForm = true}>
            Submit Information
        </button> -->
    {/if}
</div>
{/if}
