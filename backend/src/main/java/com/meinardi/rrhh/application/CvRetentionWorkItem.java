package com.meinardi.rrhh.application;

public record CvRetentionWorkItem(String id, String candidateId, String expectedResumeKey, int attemptCount, String leaseToken) {}
