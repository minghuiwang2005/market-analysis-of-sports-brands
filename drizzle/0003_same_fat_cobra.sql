ALTER TABLE "sports_timeline_events" DROP CONSTRAINT "sports_timeline_events_date_parts_check";--> statement-breakpoint
ALTER TABLE "sports_timeline_events" ADD CONSTRAINT "sports_timeline_events_date_parts_check" CHECK ((
        ("sports_timeline_events"."date_precision" = 'year' AND "sports_timeline_events"."occurred_month" IS NULL AND "sports_timeline_events"."occurred_day" IS NULL)
        OR (
          "sports_timeline_events"."date_precision" = 'month'
          AND "sports_timeline_events"."occurred_month" IS NOT NULL
          AND "sports_timeline_events"."occurred_month" BETWEEN 1 AND 12
          AND "sports_timeline_events"."occurred_day" IS NULL
        )
        OR (
          "sports_timeline_events"."date_precision" = 'day'
          AND "sports_timeline_events"."occurred_month" IS NOT NULL
          AND "sports_timeline_events"."occurred_day" IS NOT NULL
          AND "sports_timeline_events"."occurred_month" BETWEEN 1 AND 12
          AND "sports_timeline_events"."occurred_day" BETWEEN 1 AND CASE
            WHEN "sports_timeline_events"."occurred_month" IN (1, 3, 5, 7, 8, 10, 12) THEN 31
            WHEN "sports_timeline_events"."occurred_month" IN (4, 6, 9, 11) THEN 30
            WHEN "sports_timeline_events"."occurred_month" = 2 THEN CASE
              WHEN ("sports_timeline_events"."occurred_year" % 400 = 0) OR ("sports_timeline_events"."occurred_year" % 4 = 0 AND "sports_timeline_events"."occurred_year" % 100 <> 0) THEN 29
              ELSE 28
            END
            ELSE 0
          END
        )
      ));