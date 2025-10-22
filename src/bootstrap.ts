// Switch entrypoint based on URL hash
if (location.hash === '#/__polish') {
  import('./features/polish/preview').then(() => {
    // preview booted
  });
} else {
  import('./main');
}
