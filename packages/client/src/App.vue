<template>
  <div id="app">
    <nav>
      <router-link to="/">{{ $t('nav.home') }}</router-link>
      <router-link to="/login">{{ $t('nav.login') }}</router-link>
      <router-link to="/register">{{ $t('nav.register') }}</router-link>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>
