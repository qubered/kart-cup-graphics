<script lang="ts">
  import './ui.css'
  import { control } from '../store'
  import { notice } from '../ui'
</script>

<!-- The only pop-up: a command the server refused, or an action that could not be completed. -->
{#if $control.error || $notice}
  <div class="u-notice" role="alert" data-notice>{$control.error ?? $notice}</div>
{/if}
