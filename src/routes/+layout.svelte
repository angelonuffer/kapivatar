<script>
  import "../kapivatar.css"
  import "material-symbols/outlined.css"

  let { children } = $props()
</script>

<svelte:head>
  <title>Kapivatar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
</svelte:head>

{@render children()}
