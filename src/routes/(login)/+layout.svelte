<script>
  import BaseLogin from "../../base-login.svelte"

  let { children } = $props()
</script>

<BaseLogin>
  {@render children()}
</BaseLogin>
