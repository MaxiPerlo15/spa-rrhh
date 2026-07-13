# Spring Application State Machine Specification

## Purpose

Defines the Spring-owned state transition validation for application lifecycle, replicating Next's `ApplicationStatusMachine` exactly. Spring is the single authority for transition rules.

## Requirements

### Requirement: State Transition Validation

The system SHALL validate all status transitions through `ApplicationStatusMachine` in Spring. The machine MUST support exactly these transitions: `PENDING→REVIEWING`, `PENDING→REJECTED`, `REVIEWING→INTERVIEWED`, `REVIEWING→REJECTED`, `INTERVIEWED→ACCEPTED`, `INTERVIEWED→REJECTED`. `ACCEPTED` and `REJECTED` are terminal states. Same-state updates MUST be rejected.

#### Scenario: Valid forward transitions

- GIVEN an application in status `PENDING`
- WHEN the machine validates transition to `REVIEWING`
- THEN the transition is accepted

#### Scenario: Valid rejection from PENDING

- GIVEN an application in status `PENDING`
- WHEN the machine validates transition to `REJECTED`
- THEN the transition is accepted

#### Scenario: Valid forward transition from REVIEWING

- GIVEN an application in status `REVIEWING`
- WHEN the machine validates transition to `INTERVIEWED`
- THEN the transition is accepted

#### Scenario: Valid rejection from REVIEWING

- GIVEN an application in status `REVIEWING`
- WHEN the machine validates transition to `REJECTED`
- THEN the transition is accepted

#### Scenario: Valid forward transition from INTERVIEWED

- GIVEN an application in status `INTERVIEWED`
- WHEN the machine validates transition to `ACCEPTED`
- THEN the transition is accepted

#### Scenario: Valid rejection from INTERVIEWED

- GIVEN an application in status `INTERVIEWED`
- WHEN the machine validates transition to `REJECTED`
- THEN the transition is accepted

#### Scenario: Terminal state mutation rejected

- GIVEN an application in status `ACCEPTED`
- WHEN the machine validates transition to `PENDING`
- THEN the transition is rejected

#### Scenario: Same-state rejection

- GIVEN an application in status `REVIEWING`
- WHEN the machine validates transition to `REVIEWING`
- THEN the transition is rejected

### Requirement: Entity Delegation

The system SHALL have `Postulacion` entity methods (`ponerEnRevision`, `marcarComoEntrevistado`, `rechazar`, `aceptar`) delegate to `ApplicationStatusMachine` for validation. Entity methods MUST throw on invalid transitions.

#### Scenario: Entity method with valid transition

- GIVEN a `Postulacion` with status `PENDING`
- WHEN `ponerEnRevision()` is called
- THEN the status changes to `REVIEWING`

#### Scenario: Entity method with invalid transition

- GIVEN a `Postulacion` with status `ACCEPTED`
- WHEN `rechazar()` is called
- THEN an exception is thrown and status remains `ACCEPTED`

### Requirement: State Machine Parity with Next

The system SHALL maintain identical transition rules between Spring `ApplicationStatusMachine` and Next `ApplicationStatusMachine`. Any divergence is a defect.

#### Scenario: Parity verification

- GIVEN the set of valid transitions defined in Next's `ApplicationStatusMachine`
- WHEN compared against Spring's `ApplicationStatusMachine`
- THEN both sets are identical (6 valid transitions, 2 terminal states, same-state rejection)

## Explicit Non-Goals

- Modifying Next's `ApplicationStatusMachine` is out of scope — it remains the reference.
- Adding new states or transitions is out of scope.
