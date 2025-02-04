// How to make modal work in dev:
//
// You must put the ga-function (google analytics) in a comment.
// It is important to not include this change before pushing  when adding changes with
// git add -p
// when you see this change, enter 'n' to not include it.

$(function() {
  function fragmentToBuyLink(fragment) {
    var routes = {
      'en': '/en/events/',
      'no': '/arrangement/'
    };

    return routes[$('html').attr('lang')] + fragment;
  }

  function findParentEvent(element) {
    $(element).parents().each(function() {
      if($(this).hasClass('upcoming-event')) {
        element = this;
      }
    });
    return element;
  }

  // Chrome fires the onpopstate even on regular page loads,
  // so we need to detect that and ignore it.
  var popped = ('state' in window.history && window.history.state !== null), initialURL = location.href;


  function openPurchaseModal(url, source) {
    ga('send', 'pageview', {
      'page': url,
      'title': 'Purchase event - Virtual'
    });

    $.get(url, function(html) {
    $("html, body").animate({ scrollTop: 0 }, "slow");
      $(html).appendTo('body').modal({
        clickClose: false,
        escapeClose: false,
      }).on($.modal.CLOSE, function(e) {
        $(this).remove();
        ga('send', 'pageview');
        history.pushState(null, null, '#');
        popped = true;
        $('html, body').animate({
          scrollTop: $(findParentEvent(source)).offset().top
        }, 1000);
      });

      // Run the ticket limit validation after the modal has been loaded
      ticketFormLoaded();
    });

  }

  function openPurchaseModalBasedOnHash() {
      var fragment = window.location.hash.substr(1);
      if(fragment.match(/buy$/)) {
        openPurchaseModal(fragmentToBuyLink(fragment), $('body').eq(0));
      }
      else {
        if ($.modal.close()) { ga('send', 'pageview'); }
      }
  }
  openPurchaseModalBasedOnHash();

  $(document).on('click', 'a.purchase-button:not(.no-modal)', function(e) {
    history.pushState(null, null, '#' + this.getAttribute('data-event-id') + '/buy');
    popped = true;
    openPurchaseModal(this.pathname, this);
    e.preventDefault();
  });

  $(window).bind('popstate', function (e) {
    var initialPop = !popped && location.href == initialURL;
    popped = true;

    if(initialPop) return;

    openPurchaseModalBasedOnHash();
  });

  $(document).on('change', '.billig-buy input[type=radio]',
    function enforceRadioChoice() {
      // Clear selected and other input fields
      var textfield = $(this).siblings('input[type=text], input[type=email], input[type=radio]');

      var id = '#' + textfield.attr('id');
      if (id === '#membercard') {
        $('#email').prop('disabled', true);
        $('#membercard').prop('disabled', false);
        $('#email').val('');
      } else {
        $('#membercard').prop('disabled', true);
        $('#email').prop('disabled', false);
        $('#membercard').val('');
      }
    }
  );

  function ticketFormLoaded() {
    $('.ticket-table .totalAmount').html(0);
    // Keep track of ticket groups and their ticket limits
    var ticketGroupIds= getTicketGroupsIds();
    var ticketLimits = getTicketLimits(ticketGroupIds);

    // Get the default price group ticket limit
    var defaultTicketLimit = getDefaultTicketLimit();

    function getDefaultTicketLimit() {
      return parseInt($('.ticket-table').data('default-ticket-limit'));
    }

    function getTicketGroupsIds(){
      var ticketGroupOverview = {};

      $('.ticket-group-row').each(function() {
        ticketGroup = $(this).attr('id');
        ticketGroupOverview[ticketGroup] = $('.price-group-row select').find('.'+ticketGroup).map(function(){
        return $(this);
        }).get();
      });

      return Object.keys(ticketGroupOverview);
    }

    function getTicketLimits(ticketGroups){
      var ticketLimits = [];

      $.each(ticketGroups, function(i, groupId) {
        var ticketGroupLimit = $('#' + groupId).data('ticket-limit');
        ticketLimits.push(parseInt(ticketGroupLimit));
      });

      return ticketLimits;
    };

    $('.ticket-table select').change(function() {
      // Keep track of sums related to ALL ticket groups
      var totalTickets = 0;
      var totalCost = 0;

      // Variables that relate to the ticket group that fired the change event
      var ticketGroupId = $(this).attr('class');
      var ticketGroupIndex = parseInt(ticketGroupId.match(/\d+/g)[0]);
      var ticketGroupTickets = 0;
      var ticketGroupLimit = ticketLimits[ticketGroupIndex];
      var numberOfPriceGroups = 0;

      // Get the number of tickets chosen in current ticket group
      $('select.' + ticketGroupId).each(function() {
        ticketGroupTickets += parseInt($(this).val());
        numberOfPriceGroups += 1;
      });

      // Empty dropdowns and populate them with legal options
      $('select.' + ticketGroupId).each(function(){

        var chosenValue = parseInt($(this).val());
        var legalOptions = chosenValue + (ticketGroupLimit-ticketGroupTickets);
        var optionsLimit = $(this).children('option').length;

        $(this).empty();

        for (var i = 0; i < optionsLimit; i++) {
          if (i <= legalOptions) {
            $(this).append($("<option></option>").attr("value",i).text(i));
          } else {
            $(this).append($("<option disabled></option>").attr("value",i).text(i));
          }
        }

        $(this).val(chosenValue);

      });

      // Set the cost of the tickets in each price group's html
      $('.price-group-row').each(function() {
        $(this).find('.sum').html($(this).find('select').val() * $(this).find('.price').data('price'));
      });

      // Get the total cost of all tickets
      $('.price-group-row .sum').each(function() {
        totalCost += (+$(this).html());
      });

      // Get the total number of tickets chosen
      $('.price-group-row select').each(function() {
        totalTickets += (+$(this).val());
      });

      // Set the total cost and total tickets in the summary's html
      var totalTicketsHtml = 0
      if (totalTickets !== 0) {
        totalTicketsHtml = totalTickets //+ "/" + ticketLimits.reduce(function(a, b){return a + b}, 0);
      }
      $('.ticket-table .totalAmount').html(totalTicketsHtml);
      $('.ticket-table .totalSum').html(totalCost);
    });
  }

  function checkValidForm() {
    
    var email = $('#email').val();
    var membercard = $('#membercard').val();

    let isPaperticketOk = $('#ticket_type_paper').prop('checked') && email != '';
    let isCardTicketOk = $('#ticket_type_card').prop('checked') && membercard != '';

    let totalTickets = 0;
    $('.price-group-row select').each(function() {
      totalTickets += (+$(this).val());
    });
    

    if ((isPaperticketOk || isCardTicketOk) && totalTickets > 0) {
      $('.billig-buy .custom-form [name="commit"]').prop('disabled', false);
    }
    else {
      $('.billig-buy .custom-form [name="commit"]').prop('disabled', true);
    }

    // Update description
    var ticket_option_card = $('#ticket_type_card').prop('checked')
    if(ticket_option_card) {
      $('#ticketless-info').show()
      $('#paperticket-info').hide()
    } else {
      $('#ticketless-info').hide()
      $('#paperticket-info').show()
    }

    $('#validation-hint').show()
    $('#missing-user-info').css({display: (isPaperticketOk || isCardTicketOk) ? "none" : "block"})
    $('#missing-ticket-count').css({display: (totalTickets > 0) ? "none" : "block"})

  }

  $(document).on('blur keyup change', '.billig-buy .custom-form input', checkValidForm);
  $(document).on('blur keyup change', '.billig-buy .custom-form select', checkValidForm);


});
