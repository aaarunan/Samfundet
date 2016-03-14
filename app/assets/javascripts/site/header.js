$(function() {
  $(".dropdown-button.opening-hours").parent().on('click', function(event) {
    $(".dropdown-content-wrapper.opening-hours").toggleClass('max-height');
    $(".dropdown-button.opening-hours .caret-wrapper").toggleClass('flip');
    event.preventDefault();
  });

  $(".dropdown-button.menu-items").parent().on('click', function(event) {
    $(".dropdown-content-wrapper.menu-items").toggleClass('max-height');
    $(".dropdown-button.menu-items .caret-wrapper").toggleClass('flip');
    event.preventDefault();
  });
});
