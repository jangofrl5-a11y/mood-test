describe('Mood app quick smoke', () => {
  it('loads home, opens a day tile and settings', () => {
    cy.visit('http://localhost:5174/')
    cy.contains(/Daily Surah|Daily Surah/i)
    // wait for month grid to render
    cy.get('.month-calendar .day-tile').should('have.length.greaterThan', 0)
    cy.get('.month-calendar .day-tile').first().click()
    cy.get('.day-modal').should('be.visible')
    // open settings
    cy.contains('Open Settings').click({force:true})
    cy.get('.day-modal').should('be.visible')
    // toggle notify checkbox if present
    cy.get('#notifyToggle').then($el => { if($el.length) cy.wrap($el).click() })
    // close modal
    cy.contains('Close').click({multiple:true})
  })
})
