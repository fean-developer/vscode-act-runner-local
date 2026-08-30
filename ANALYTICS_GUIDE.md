# Analytics - Act Visual Runner

[English](ANALYTICS_GUIDE.md) | [Português (Brasil)](ANALYTICS_GUIDE-pt-br.md)

This panel consolidates local execution history for Act Visual Runner. It helps you understand execution time, failure frequency, estimated minutes, and which jobs have the greatest impact on workflow duration.

## Filters

### Timeframe

Defines the analysis period: the last 7, 30, or 90 days, or all available history.

### Workflow

Filters data by workflow. Use it to compare a single pipeline, such as `CI/CD Pipeline`.

### Job

Filters data by a specific job. This helps investigate the timing and failures of an individual workflow stage, such as build, tests, or deploy.

### Status

Filters executions by result: success, failure, or cancellation.

### Clear All Filters

Removes workflow, job, and status filters and returns to an aggregate view of the selected period.

## Overview

### Average Duration

Average duration of the jobs or executions selected by the current filters. Use it to identify whether a pipeline is becoming slower over time.

### Average Failure Rate

Average percentage of failed executions in the filtered set. It also shows the failure count relative to the total analyzed.

### Total Minutes

Total minutes executed locally during the filtered period. This helps show the total processing volume spent on workflows.

### Billable Minutes

Represents minutes comparable to minutes billed for hosted execution. In the local context, this is an operational estimate.

### Est. Time Saved

Estimated time saved compared with hosted execution. The calculation is an approximation based on the total recorded minutes.

### Est. Cost Savings

Estimated financial savings based on time saved. This approximate value is a trend indicator, not an actual charge.

## Charts

### Builds Over Time

Shows the number of executions per day in the selected period. Green bars represent successful executions and red bars represent failures.

### Minutes Over Time

Shows minutes consumed per day. Use it to identify usage peaks, heavier workflows, and periods when local execution took longer.

### Success & Errors

Side summary for the charts. Displays successful and failed execution totals, or the aggregate volume related to the selected chart.

## Job Duration Distribution

Groups jobs into duration ranges such as `0-1m`, `1-5m`, and `5-10m`. This distribution shows whether most jobs are fast or concentrated in longer ranges.

## Top 5 Slowest Jobs

Lists the five jobs with the longest average duration. Use this section to prioritize optimizations such as dependency caching, parallelization, fewer steps, or Docker image adjustments.

## Notes About the Data

The data comes from the local history stored by the extension. If there is not enough history, some charts may be empty or show low values. The more executions are recorded, the more useful the trend analysis becomes.
