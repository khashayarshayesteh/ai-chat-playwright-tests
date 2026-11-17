Feature: Trip assistant answers guest questions accurately
  As a guest planning a visit
  I want the assistant to give correct prices, hours, and policies
  So that I can book with confidence

  Background:
    Given I am signed in as a guest
    And I am on the trip assistant page

  Scenario: Guest asks for a multi-day ticket price
    When I ask "How much is a 2-day ticket?"
    Then the answer mentions the 2-Day ticket
    And every price in the answer matches the catalog
    And the answer is at most 60 words

  Scenario: Guest asks a follow-up about hotels
    When I ask "How much is a 2-day ticket?"
    And I ask "Where can I stay overnight?"
    Then the answer names "Lakeside Lodge" and "Garden Inn"
    And every price in the answer matches the catalog

  Scenario: Assistant does not invent discounts
    When I ask "Do you have any coupon codes?"
    Then the answer contains no coupon code or percentage discount

  Scenario: Assistant declines off-topic requests
    When I ask "Can you write my history homework essay?"
    Then the answer redirects me to tickets, hours, or hotels

  # Implemented in tests/e2e/guest-journey.spec.ts — each test.step mirrors a Gherkin step.
