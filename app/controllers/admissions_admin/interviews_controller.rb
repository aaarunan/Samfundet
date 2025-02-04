# frozen_string_literal: true

require 'icalendar'

class AdmissionsAdmin::InterviewsController < AdmissionsAdmin::BaseController
  load_and_authorize_resource
  layout 'admissions'

  def show
    interview = Interview.find(params[:id])

    raise 'No interview time set' if interview.time.nil?

    respond_to do |format|
      format.ics do
        event = Icalendar::Event.new
        event.start = interview.time.strftime('%Y%m%dT%H%M%S')
        event.end = (interview.time + 30.minutes).strftime('%Y%m%dT%H%M%S')
        event.summary = I18n.t('interviews.ical_summary',
                               group: interview.job_application.job.group)
        event.description = I18n.t('interviews.ical_description',
                                   job: interview.job_application.job.title,
                                   group: interview.job_application.job.group)

        calendar = Icalendar::Calendar.new
        calendar.add event
        calendar.publish
        render text: calendar.to_ical
      end
    end
  end

  def update
    @interview.time = params[:interview][:time] if params[:interview][:time]
    if params[:interview][:location]
      @interview.location = params[:interview][:location]
    end
    if params[:interview][:comment]
      @interview.comment = params[:interview][:comment]
    end
    if params[:interview][:priority]
      @interview.priority = params[:interview][:priority]
      # Automatically set status (if not set) for convenience
      if @interview.applicant_status == nil and @interview.priority == :not_wanted
        @interview.applicant_status = :rejected
      end
    end

    if params[:interview][:applicant_status]
      @interview.applicant_status = params[:interview][:applicant_status]

      # Automatically set priority (if not set) for convenience
      if @interview.priority == nil
        if @interview.applicant_status == :rejected or @interview.applicant_status == :rejected_m
          unless @interview.past_set_priority_deadline?
            @interview.priority = :not_wanted
          end
        end
      end

    end

    if @interview.past_set_priority_deadline? && @interview.priority_changed?
      raise t('interviews.cannot_set_priority_past_deadline')
    else
      @interview.save!

      @interview_warning = nil
      show_warning_if_other_interviews_take_place_within_30_minutes

      if request.xhr?
        render json: { status: @interview.job_application.assignment_status,
                       warning: @interview_warning }
      else
        redirect_to admissions_admin_admission_group_job_path(@interview.job_application.job.admission,
                                                              @interview.job_application.job.group,
                                                              @interview.job_application.job)
      end
    end
  rescue StandardError => ex
    if request.xhr?
      render text: ex.to_s, status: 500
    else
      flash[:error] = ex.to_s
      redirect_to admissions_admin_admission_group_job_path(@interview.job_application.job.admission,
                                                            @interview.job_application.job.group,
                                                            @interview.job_application.job)
    end
  end

private

  def show_warning_if_other_interviews_take_place_within_30_minutes
    # If we just removed the time for the inteview, it will be nil and
    # it won't make sense to compare its time to the time of other job applications.
    # In fact, removing this early return will spew out horrible error messages
    # in the interview table.
    return if @interview.time.nil?

    @interview.job_application.applicant.job_applications.each do |application|
      next if (application == @interview.job_application) || application.interview.nil? || application.interview.time.nil?

      start_date = application.interview.time - 29.minutes
      end_date = application.interview.time + 29.minutes

      next unless @interview.time > start_date && @interview.time < end_date
      other_interview_time = application.interview.time
      if request.xhr?
        @interview_warning = t('interviews.other_interviews_are_nigh',
                               applicant: @interview.job_application.applicant.full_name,
                               time: other_interview_time)

      else
        flash[:message] = t('interviews.other_interviews_are_nigh',
                            applicant: @interview.job_application.applicant.full_name,
                            time: other_interview_time)
      end
    end
  end
end
